import { useCallback, useEffect, useReducer, useRef } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { getModel, getDefaultMode } from "../core/env.ts";
import { loadConfig, saveConfig, setActiveProfile } from "../core/config.ts";
import {
  listProfiles,
  loadProfileConfig,
  resolveActiveProfile,
} from "../core/profiles/index.ts";
import { readFileSync } from "node:fs";
import { schemaPath, memoryPath } from "../core/paths.ts";
import type { Schema, SafetyMode, AgentEvent, ChatTurn } from "../shared/types.ts";
import { MAX_CHAT_HISTORY } from "../shared/types.ts";
import { runAgentTurn, refreshSchema } from "../core/agent/index.ts";
import { appReducer, uid, type AppState } from "./state/store.ts";
import { StatusStrip } from "./components/StatusStrip.tsx";
import { Transcript } from "./components/Transcript.tsx";
import { PromptBar } from "./components/PromptBar.tsx";
import { ConfirmOverlay } from "./components/ConfirmOverlay.tsx";
import { CommandPalette, HelpOverlay } from "./components/CommandPalette.tsx";
import { computeGhost } from "./autocomplete.ts";
import { theme } from "./theme.ts";
import { setupKeymap } from "./keymap.ts";

function loadSchemaTables(profile: string): string[] {
  try {
    const schema = JSON.parse(readFileSync(schemaPath(profile), "utf8")) as Schema;
    return schema.tables.map((t) => t.name);
  } catch {
    return [];
  }
}

function App() {
  const renderer = useRenderer();
  const config = loadConfig();
  const profile = resolveActiveProfile();
  const dbConfig = profile ? loadProfileConfig(profile) : null;

  const initial: AppState = {
    profile,
    database: dbConfig?.database ?? "",
    mode: config.default_mode ?? getDefaultMode(),
    model: config.default_model ?? getModel(),
    blocks: [],
    input: "",
    ghost: "",
    busy: false,
    paletteOpen: false,
    helpOpen: false,
    confirm: null,
    inspectorOpen: false,
  };

  const [state, dispatch] = useReducer(appReducer, initial);
  const [inputKey, setInputKey] = useReducer((n: number) => n + 1, 0);
  const confirmResolver = useRef<((v: boolean) => void) | null>(null);
  const chunkBuffer = useRef("");
  const chunkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerId = useRef<string | null>(null);
  const chatHistoryRef = useRef<ChatTurn[]>([]);

  const profiles = listProfiles();
  const tables = state.profile ? loadSchemaTables(state.profile) : [];

  const flushChunks = useCallback(() => {
    if (!answerId.current || !chunkBuffer.current) return;
    dispatch({ type: "append-answer", id: answerId.current, chunk: chunkBuffer.current });
    chunkBuffer.current = "";
  }, []);

  const handleAgentEvent = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case "thinking":
          dispatch({ type: "sync-thinking" });
          break;
        case "schema": {
          if (!state.profile) break;
          const schema = JSON.parse(readFileSync(schemaPath(state.profile), "utf8")) as Schema;
          dispatch({
            type: "add-block",
            block: {
              id: uid("schema"),
              kind: "schema",
              tables: event.tables.map((name) => ({
                name,
                colCount: schema.tables.find((t) => t.name === name)?.columns.length ?? 0,
              })),
            },
          });
          break;
        }
        case "execution":
          dispatch({ type: "clear-thinking" });
          dispatch({
            type: "add-block",
            block: {
              id: uid("exec"),
              kind: "execution",
              tool: event.tool,
              sql: event.sql,
              result: event.result,
              writeResult: event.writeResult,
              error: event.error,
            },
          });
          break;
        case "memory":
          dispatch({ type: "add-block", block: { id: uid("mem"), kind: "memory", section: event.section } });
          break;
        case "answer-chunk": {
          dispatch({ type: "clear-thinking" });
          if (!answerId.current) {
            answerId.current = uid("ans");
            dispatch({
              type: "add-block",
              block: { id: answerId.current, kind: "answer", content: "", streaming: true },
            });
          }
          chunkBuffer.current += event.content;
          if (!chunkTimer.current) {
            chunkTimer.current = setTimeout(() => {
              flushChunks();
              chunkTimer.current = null;
            }, 50);
          }
          break;
        }
        case "answer-clear":
          if (answerId.current) {
            dispatch({ type: "clear-answer", id: answerId.current });
            answerId.current = null;
            chunkBuffer.current = "";
          }
          break;
        case "answer-done":
          flushChunks();
          if (answerId.current) {
            dispatch({ type: "finalize-answer", id: answerId.current, content: event.content });
          }
          answerId.current = null;
          break;
        case "error":
          dispatch({ type: "add-block", block: { id: uid("err"), kind: "error", message: event.message } });
          break;
        case "done":
          dispatch({ type: "clear-thinking" });
          dispatch({ type: "set-busy", busy: false });
          break;
      }
    },
    [flushChunks, state.profile],
  );

  const runQuestion = useCallback(
    async (question: string) => {
      if (!state.profile || state.busy) return;
      dispatch({ type: "add-block", block: { id: uid("user"), kind: "user", text: question } });
      dispatch({ type: "set-input", value: "", ghost: "" });
      setInputKey();
      dispatch({ type: "set-busy", busy: true });
      answerId.current = null;

      try {
        const prior = chatHistoryRef.current;
        const answer = await runAgentTurn(
          {
            profileName: state.profile,
            mode: state.mode,
            model: state.model,
            onEvent: handleAgentEvent,
            onConfirm: (reason, sql) =>
              new Promise<boolean>((resolve) => {
                const id = uid("confirm");
                confirmResolver.current = resolve;
                dispatch({ type: "set-confirm", confirm: { id, reason, sql } });
              }),
          },
          question,
          prior,
        );

        const next: ChatTurn[] = [{ role: "user", content: question }];
        if (answer.trim()) next.push({ role: "assistant", content: answer });
        chatHistoryRef.current = [...prior, ...next].slice(-MAX_CHAT_HISTORY);
      } catch (e) {
        dispatch({
          type: "add-block",
          block: {
            id: uid("err"),
            kind: "error",
            message: e instanceof Error ? e.message : String(e),
          },
        });
        dispatch({ type: "set-busy", busy: false });
      }
    },
    [state.profile, state.busy, state.mode, state.model, handleAgentEvent],
  );

  const handleSlash = useCallback(
    async (line: string) => {
      const parts = line.trim().split(/\s+/);
      const cmd = parts[0]!.toLowerCase();

      switch (cmd) {
        case "/help":
          dispatch({ type: "set-help", open: true });
          break;
        case "/clear":
          chatHistoryRef.current = [];
          dispatch({ type: "clear" });
          break;
        case "/quit":
        case "/exit":
          renderer.destroy();
          break;
        case "/profiles":
          dispatch({
            type: "add-block",
            block: {
              id: uid("ans"),
              kind: "answer",
              content: profiles.map((p) => `- ${p}${p === state.profile ? " (active)" : ""}`).join("\n"),
              streaming: false,
            },
          });
          break;
        case "/connect": {
          const name = parts[1];
          if (!name) break;
          setActiveProfile(name);
          const cfg = loadProfileConfig(name);
          dispatch({ type: "set-profile", profile: name, database: cfg.database });
          break;
        }
        case "/mode": {
          const mode = parts[1] as SafetyMode;
          if (mode === "safe" || mode === "confirm" || mode === "yolo") {
            dispatch({ type: "set-mode", mode });
            const c = loadConfig();
            c.default_mode = mode;
            saveConfig(c);
          }
          break;
        }
        case "/model": {
          const model = parts.slice(1).join(" ");
          if (model) {
            dispatch({ type: "set-model", model });
            const c = loadConfig();
            c.default_model = model;
            saveConfig(c);
          }
          break;
        }
        case "/refresh":
          if (state.profile) await refreshSchema(state.profile);
          break;
        case "/schema": {
          const table = parts[1];
          if (state.profile && table) {
            const schema = JSON.parse(readFileSync(schemaPath(state.profile), "utf8")) as Schema;
            const t = schema.tables.find((x) => x.name.toLowerCase() === table.toLowerCase());
            dispatch({
              type: "add-block",
              block: {
                id: uid("ans"),
                kind: "answer",
                content: t
                  ? t.columns.map((c) => `- ${c.name}: ${c.type}`).join("\n")
                  : `Table '${table}' not found`,
                streaming: false,
              },
            });
          } else if (state.profile) {
            const schema = JSON.parse(readFileSync(schemaPath(state.profile), "utf8")) as Schema;
            dispatch({
              type: "add-block",
              block: {
                id: uid("ans"),
                kind: "answer",
                content: schema.tables.map((t) => `- ${t.name} (~${t.row_count} rows)`).join("\n"),
                streaming: false,
              },
            });
          }
          break;
        }
        case "/memory":
          if (state.profile) {
            dispatch({
              type: "add-block",
              block: {
                id: uid("ans"),
                kind: "answer",
                content: memoryPath(state.profile),
                streaming: false,
              },
            });
          }
          break;
      }
    },
    [profiles, renderer, state.profile],
  );

  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("/")) {
        await handleSlash(trimmed);
        return;
      }
      await runQuestion(trimmed);
    },
    [handleSlash, runQuestion],
  );

  useEffect(() => {
    setupKeymap(renderer, {
      onPalette: () => dispatch({ type: "set-palette", open: true }),
      onClear: () => {
        chatHistoryRef.current = [];
        dispatch({ type: "clear" });
      },
      onRefresh: () => {
        if (state.profile) refreshSchema(state.profile).catch(console.error);
      },
      onQuit: () => renderer.destroy(),
      onToggleHelp: () => dispatch({ type: "set-help", open: true }),
      onAcceptGhost: () => dispatch({ type: "accept-ghost" }),
    });
  }, [renderer, state.profile]);

  useKeyboard((key) => {
    if (!state.confirm) return;

    if (key.name === "y") {
      confirmResolver.current?.(true);
      confirmResolver.current = null;
      dispatch({ type: "set-confirm", confirm: null });
    }
    if (key.name === "n" || key.name === "escape") {
      confirmResolver.current?.(false);
      confirmResolver.current = null;
      dispatch({ type: "set-confirm", confirm: null });
    }
  });

  useEffect(() => {
    const ghost = computeGhost(state.input, profiles, tables);
    if (ghost !== state.ghost) {
      dispatch({ type: "set-input", value: state.input, ghost });
    }
  }, [state.input, profiles, tables]);

  if (!state.profile) {
    return (
      <box style={{ flexDirection: "column", width: "100%", height: "100%", backgroundColor: theme.bg }}>
        <StatusStrip profile={null} mode={state.mode} model={state.model} />
        <box
          style={{
            flexGrow: 1,
            minHeight: 0,
            flexDirection: "column",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <text fg={theme.fgMuted}>No active profile. Run `asksql new` or `/connect`.</text>
        </box>
      </box>
    );
  }

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        backgroundColor: theme.bg,
      }}
    >
      <StatusStrip profile={state.profile} mode={state.mode} model={state.model} />
      <box
        style={{
          flexGrow: 1,
          minHeight: 0,
          flexShrink: 1,
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Transcript blocks={state.blocks} database={state.database} onExample={(q) => handleSubmit(q)} />
      </box>
      <PromptBar
        value={state.input}
        ghost={state.ghost}
        disabled={state.busy || !!state.confirm}
        inputKey={inputKey}
        onChange={(v) => dispatch({ type: "set-input", value: v, ghost: state.ghost })}
        onSubmit={handleSubmit}
      />
      {state.paletteOpen && (
        <CommandPalette
          filter={state.input}
          onSelect={(cmd) => {
            dispatch({ type: "set-palette", open: false });
            handleSubmit(cmd);
          }}
          onClose={() => dispatch({ type: "set-palette", open: false })}
        />
      )}
      {state.helpOpen && <HelpOverlay />}
      {state.confirm && (
        <ConfirmOverlay
          request={state.confirm}
          onConfirm={(approved) => {
            confirmResolver.current?.(approved);
            confirmResolver.current = null;
            dispatch({ type: "set-confirm", confirm: null });
          }}
        />
      )}
    </box>
  );
}

export async function launchTui(): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: false });
  renderer.root.width = "100%";
  renderer.root.height = "100%";
  renderer.root.flexDirection = "column";
  createRoot(renderer).render(<App />);
}
