import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import type {
  AgentEvent,
  AgentScope,
  SafetyMode,
  Schema,
  SqlReadResult,
  ChatTurn,
} from "../../shared/types.ts";
import {
  DEFAULT_MODEL,
  MAX_AGENT_STEPS,
  MAX_RESULT_BYTES,
  DEFAULT_READ_LIMIT,
  MAX_CHAT_HISTORY,
  MAX_PROJECT_MEMORY_CHARS,
} from "../../shared/types.ts";
import { memoryPath, schemaPath, historyPath } from "../paths.ts";
import { loadProfileConfig } from "../profiles/index.ts";
import { createConnection, executeWrite, queryRows } from "../mysql.ts";
import { introspectSchema, schemaIndexLine, columnsSummary } from "../schema/introspect.ts";
import { appendMemorySection } from "../memory.ts";
import {
  classifySql,
  enforceReadOnly,
  ensureLimit,
  gateAction,
  truncateCell,
} from "../safety/classifier.ts";
import type { RowDataPacket } from "mysql2/promise";

export interface AgentContext {
  scope: AgentScope;
  mode: SafetyMode;
  model: string;
  onEvent: (event: AgentEvent) => void;
  onConfirm?: (reason: string, sql: string) => Promise<boolean>;
}

const PROFILE_PARAM = {
  type: "string" as const,
  description: "Profile name (required in project mode)",
};

const TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "inspect_schema",
      description: "Inspect database schema. Omit table for all tables summary.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Optional table name" },
          profile: PROFILE_PARAM,
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_sql_read",
      description: "Run a read-only SQL query (SELECT, SHOW, EXPLAIN, etc.)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          profile: PROFILE_PARAM,
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_sql_write",
      description: "Run a write or DDL SQL statement (mode-gated)",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          profile: PROFILE_PARAM,
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_memory",
      description: "Append an observation to memory.md under a section heading",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string" },
          content: { type: "string" },
          profile: PROFILE_PARAM,
        },
        required: ["section", "content"],
      },
    },
  },
];

function loadSchema(profileName: string): Schema {
  return JSON.parse(readFileSync(schemaPath(profileName), "utf8")) as Schema;
}

function truncateMemory(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + "\n… (memory truncated for project mode)";
}

function modeDescription(mode: SafetyMode): string {
  if (mode === "safe") return "safe mode: READ only; writes denied";
  if (mode === "confirm") return "confirm mode: READ allowed; WRITE/DDL requires user confirmation";
  return "yolo mode: READ and WRITE/DDL allowed without confirmation";
}

function buildProfileSection(profileName: string, memoryCap?: number): string {
  const schema = loadSchema(profileName);
  const memoryRaw = readFileSync(memoryPath(profileName), "utf8");
  const memory = memoryCap ? truncateMemory(memoryRaw, memoryCap) : memoryRaw;
  const index = schema.tables.map((t) => schemaIndexLine(t)).join("\n");
  return `### Profile: ${profileName} (database: ${schema.database})

Schema index:
${index}

Memory (memory.md):
${memory}`;
}

export function buildSystemPrompt(scope: AgentScope, mode: SafetyMode): string {
  const modeDesc = modeDescription(mode);

  if (scope.kind === "profile") {
    const schema = loadSchema(scope.profileName);
    const memory = readFileSync(memoryPath(scope.profileName), "utf8");
    const index = schema.tables.map((t) => schemaIndexLine(t)).join("\n");

    return `You are a MySQL data assistant for database "${schema.database}".
Safety mode: ${modeDesc}

Schema index:
${index}

Memory (memory.md):
${memory}

Rules:
- Never invent columns; use inspect_schema first if unsure.
- Default to LIMIT N for exploratory reads.
- When the user teaches you something, call update_memory.
- Query results render inline in the UI as tables. Never repeat row data in your answer: no lists, tables, or "here are N rows" preambles. Only add interpretation, caveats, or next steps in 1-3 sentences.
- Use the conversation history for follow-up messages (e.g. "that are caregivers" refers to the previous question).
- Prefer a single run_sql_read query per turn when possible. Use inspect_schema first instead of a exploratory SELECT you will replace.`;
  }

  const profileList = scope.profileNames.join(", ");
  const sections = scope.profileNames
    .map((p) => buildProfileSection(p, MAX_PROJECT_MEMORY_CHARS))
    .join("\n\n");

  return `You are a MySQL data assistant for project "${scope.projectName}" with ${scope.profileNames.length} database profile(s): ${profileList}.
Safety mode: ${modeDesc}

This is PROJECT mode. Each profile is a separate MySQL database. Cross-database joins in one SQL call are NOT supported.

${sections}

Rules:
- Every tool call MUST include the "profile" parameter naming which profile to use (${profileList}).
- Never invent columns; use inspect_schema with the correct profile first if unsure.
- Default to LIMIT N for exploratory reads.
- When the user teaches you something, call update_memory with the appropriate profile.
- Query results render inline in the UI as tables. Never repeat row data in your answer.
- Use conversation history for follow-ups; disambiguate which profile when the user refers to "the other database".`;
}

export function resolveToolProfile(
  scope: AgentScope,
  args: Record<string, unknown>,
): string | { error: string } {
  if (scope.kind === "profile") {
    return scope.profileName;
  }

  const profile = args.profile as string | undefined;
  if (!profile) {
    return {
      error: `profile parameter required in project mode. Available: ${scope.profileNames.join(", ")}`,
    };
  }
  if (!scope.profileNames.includes(profile)) {
    return {
      error: `Profile '${profile}' is not in this project. Available: ${scope.profileNames.join(", ")}`,
    };
  }
  return profile;
}

function createClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
}

async function runInspectSchema(profileName: string, table?: string): Promise<unknown> {
  const schema = loadSchema(profileName);
  if (table) {
    const t = schema.tables.find((x) => x.name.toLowerCase() === table.toLowerCase());
    if (!t) return { error: `Table '${table}' not found` };
    return {
      name: t.name,
      columns: t.columns,
      foreign_keys: t.foreign_keys,
      indexes: t.indexes,
      row_count: t.row_count,
    };
  }
  return {
    tables: schema.tables.map((t) => ({
      name: t.name,
      row_count: t.row_count,
      columns_summary: columnsSummary(t),
    })),
  };
}

async function runSqlRead(profileName: string, query: string): Promise<SqlReadResult | { error: string }> {
  const check = enforceReadOnly(query);
  if (!check.ok) return { error: check.error };

  const limited = ensureLimit(query, DEFAULT_READ_LIMIT);
  const config = loadProfileConfig(profileName);
  const conn = await createConnection(config);
  try {
    const rows = await queryRows<RowDataPacket>(conn, limited);
    const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
    const serialized: Record<string, unknown>[] = [];
    let bytes = 0;
    let truncated = false;

    for (const row of rows) {
      const entry: Record<string, unknown> = {};
      for (const col of columns) {
        entry[col] = row[col];
      }
      const size = JSON.stringify(entry).length;
      if (bytes + size > MAX_RESULT_BYTES) {
        truncated = true;
        break;
      }
      bytes += size;
      serialized.push(entry);
    }

    if (rows.length > serialized.length) truncated = true;

    return {
      columns,
      rows: serialized.map((r) => {
        const display: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) {
          display[k] = truncateCell(v);
        }
        return display;
      }),
      rowcount: serialized.length,
      truncated,
    };
  } finally {
    await conn.end();
  }
}

async function runSqlWrite(
  ctx: AgentContext,
  profileName: string,
  query: string,
): Promise<{ ok: boolean; rowcount?: number; error?: string }> {
  const kind = classifySql(query);
  const action = gateAction(ctx.mode, kind);

  if (action === "DENY") {
    return { ok: false, error: `${kind} denied in ${ctx.mode} mode` };
  }

  if (action === "CONFIRM") {
    if (!ctx.onConfirm) return { ok: false, error: "Confirmation required but no handler" };
    const approved = await ctx.onConfirm(`${kind} in confirm mode`, query);
    if (!approved) return { ok: false, error: "user declined" };
  }

  const config = loadProfileConfig(profileName);
  const conn = await createConnection(config);
  try {
    const rowcount = await executeWrite(conn, query);
    return { ok: true, rowcount };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await conn.end();
  }
}

async function runUpdateMemory(profileName: string, section: string, content: string) {
  const path = memoryPath(profileName);
  const updated = appendMemorySection(readFileSync(path, "utf8"), section, content);
  writeFileSync(path, updated, "utf8");
  return { ok: true, path, section };
}

async function executeTool(
  ctx: AgentContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const resolved = resolveToolProfile(ctx.scope, args);
  if (typeof resolved !== "string") return resolved;

  const profileName = resolved;

  switch (name) {
    case "inspect_schema": {
      const table = args.table as string | undefined;
      const result = await runInspectSchema(profileName, table);
      if (!table && "tables" in (result as object)) {
        const tables = (result as { tables: { name: string }[] }).tables.map((t) => t.name);
        ctx.onEvent({ type: "schema", tables, profile: profileName });
      } else if (table) {
        ctx.onEvent({ type: "schema", tables: [table], profile: profileName });
      }
      return result;
    }
    case "run_sql_read": {
      const query = String(args.query ?? "");
      const result = await runSqlRead(profileName, query);
      if ("error" in result) {
        ctx.onEvent({
          type: "execution",
          tool: "run_sql_read",
          sql: query,
          profile: profileName,
          error: result.error,
        });
      } else {
        ctx.onEvent({
          type: "execution",
          tool: "run_sql_read",
          sql: query,
          profile: profileName,
          result,
        });
      }
      return result;
    }
    case "run_sql_write": {
      const query = String(args.query ?? "");
      const result = await runSqlWrite(ctx, profileName, query);
      ctx.onEvent({
        type: "execution",
        tool: "run_sql_write",
        sql: query,
        profile: profileName,
        writeResult: result,
        error: result.error,
      });
      return result;
    }
    case "update_memory": {
      const section = String(args.section ?? "");
      const content = String(args.content ?? "");
      const result = await runUpdateMemory(profileName, section, content);
      ctx.onEvent({ type: "memory", section, profile: profileName });
      return result;
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function historyProfileForScope(scope: AgentScope): string {
  if (scope.kind === "profile") return scope.profileName;
  return scope.profileNames[0]!;
}

export async function runAgentTurn(
  ctx: AgentContext,
  userMessage: string,
  priorTurns: ChatTurn[] = [],
): Promise<string> {
  const client = createClient();
  const historyMessages: ChatCompletionMessageParam[] = priorTurns
    .slice(-MAX_CHAT_HISTORY)
    .map((t) => ({ role: t.role, content: t.content }));

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(ctx.scope, ctx.mode) },
    ...historyMessages,
    { role: "user", content: userMessage },
  ];

  let finalAnswer = "";
  let steps = 0;

  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    steps = step;
    ctx.onEvent({ type: "thinking" });

    const stream = await client.chat.completions.create({
      model: ctx.model || DEFAULT_MODEL,
      messages,
      tools: TOOLS,
      stream: true,
    });

    let content = "";
    const toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();
    let hadToolCalls = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        content += delta.content;
        if (!hadToolCalls) {
          ctx.onEvent({ type: "answer-chunk", content: delta.content });
        }
      }

      if (delta.tool_calls) {
        hadToolCalls = true;
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          let entry = toolCalls.get(idx);
          if (!entry) {
            entry = { id: tc.id ?? "", name: tc.function?.name ?? "", arguments: "" };
            toolCalls.set(idx, entry);
          }
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.arguments += tc.function.arguments;
        }
      }
    }

    if (!hadToolCalls && content) {
      finalAnswer = content;
      ctx.onEvent({ type: "answer-done", content });
      break;
    }

    if (hadToolCalls && content) {
      ctx.onEvent({ type: "answer-clear" });
    }

    if (toolCalls.size === 0) break;

    const assistantMsg: ChatCompletionMessageParam = {
      role: "assistant",
      content: content || null,
      tool_calls: [...toolCalls.values()].map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    };
    messages.push(assistantMsg);

    for (const tc of toolCalls.values()) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.arguments || "{}") as Record<string, unknown>;
      } catch {
        args = {};
      }
      const result = await executeTool(ctx, tc.name, args);
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  if (!finalAnswer && steps >= MAX_AGENT_STEPS - 1) {
    const err = "Agent exceeded maximum step count (10)";
    ctx.onEvent({ type: "error", message: err });
    throw new Error(err);
  }

  const logProfile = historyProfileForScope(ctx.scope);
  try {
    if (existsSync(historyPath(logProfile))) {
      appendFileSync(
        historyPath(logProfile),
        JSON.stringify({ ts: new Date().toISOString(), q: userMessage, a: finalAnswer }) + "\n",
      );
    } else {
      appendFileSync(
        historyPath(logProfile),
        JSON.stringify({ ts: new Date().toISOString(), q: userMessage, a: finalAnswer }) + "\n",
      );
    }
  } catch {
    // history is optional
  }

  ctx.onEvent({ type: "done" });
  return finalAnswer;
}

export async function refreshSchema(profileName: string): Promise<Schema> {
  const config = loadProfileConfig(profileName);
  const conn = await createConnection(config);
  try {
    const schema = await introspectSchema(conn, config.database);
    writeFileSync(schemaPath(profileName), JSON.stringify(schema, null, 2), "utf8");
    return schema;
  } finally {
    await conn.end();
  }
}
