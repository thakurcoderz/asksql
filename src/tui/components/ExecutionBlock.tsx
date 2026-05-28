import { theme, syntaxStyle } from "../theme.ts";
import type { SqlReadResult } from "../../shared/types.ts";
import { ResultTable } from "./ResultTable.tsx";
import { sanitizeAnswerAfterResult } from "../format/answerSanitize.ts";
import { sqlOneLine } from "../format/resultTable.ts";

export function ExecutionBlock(props: {
  tool: "run_sql_read" | "run_sql_write";
  sql: string;
  profile?: string;
  result?: SqlReadResult;
  writeResult?: { ok: boolean; rowcount?: number; error?: string };
  error?: string;
  collapsed?: boolean;
}) {
  const isRead = props.tool === "run_sql_read";
  const rowLabel = props.result
    ? `${props.result.rowcount} row${props.result.rowcount === 1 ? "" : "s"}`
    : props.writeResult?.ok
      ? `${props.writeResult.rowcount ?? 0} affected`
      : "failed";

  if (props.collapsed) {
    return (
      <text fg={theme.fgDim} style={{ paddingLeft: 2, marginBottom: 1 }}>
        ↳ {props.profile ? `${props.profile} · ` : ""}{isRead ? "read" : "write"} · {rowLabel} · {sqlOneLine(props.sql, 64)}
      </text>
    );
  }

  return (
    <box
      style={{
        flexDirection: "column",
        marginBottom: 1,
        marginLeft: 1,
        marginRight: 1,
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgCard,
      }}
    >
      <box
        style={{
          paddingLeft: 1,
          paddingRight: 1,
          height: 1,
          backgroundColor: theme.bgElevated,
        }}
      >
        <text fg={isRead ? theme.safe : theme.warn}>
          {props.profile ? `${props.profile} · ` : ""}{isRead ? "read" : "write"} · {rowLabel}
        </text>
      </box>

      <box style={{ paddingLeft: 1, paddingRight: 1, paddingTop: 1, flexDirection: "column", flexShrink: 0 }}>
        {/* Default Code wrapMode is "word"; long SQL wraps to huge intrinsic height vs draw → empty band */}
        <code
          wrapMode="none"
          content={props.sql.trim()}
          filetype="sql"
          syntaxStyle={syntaxStyle}
        />
      </box>

      {props.result && (
        <box style={{ paddingTop: 1, flexDirection: "column" }}>
          <ResultTable result={props.result} />
        </box>
      )}

      {(props.error || props.writeResult?.error) && (
        <box style={{ padding: 1, backgroundColor: theme.bgElevated, flexDirection: "column" }}>
          <text fg={theme.errorAccent}>{props.error ?? props.writeResult?.error}</text>
        </box>
      )}

      {props.writeResult?.ok && !props.result && (
        <box style={{ padding: 1 }}>
          <text fg={theme.safe}>OK · {props.writeResult.rowcount ?? 0} rows affected</text>
        </box>
      )}
    </box>
  );
}

export function AnswerBlock(props: {
  content: string;
  streaming: boolean;
  afterResult?: boolean;
}) {
  let text = props.content.trim();
  if (!text) return null;

  if (props.afterResult) {
    text = sanitizeAnswerAfterResult(text);
  }
  if (!text) return null;

  return (
    <box style={{ paddingLeft: 2, paddingRight: 1, marginBottom: 1, flexDirection: "column" }}>
      <text fg={theme.fgDim}>answer</text>
      <markdown content={text} syntaxStyle={syntaxStyle} conceal streaming={props.streaming} />
    </box>
  );
}

export function UserBlock(props: { text: string }) {
  return (
    <box style={{ marginBottom: 1, paddingLeft: 1 }}>
      <text>
        <span fg={theme.accent}>› </span>
        <span fg={theme.fg}>{props.text}</span>
      </text>
    </box>
  );
}

export function SchemaBlock(props: { tables: { name: string; colCount: number }[] }) {
  const line = props.tables.map((t) => `${t.name}(${t.colCount})`).join(" · ");
  return (
    <text fg={theme.fgDim} style={{ paddingLeft: 2, marginBottom: 1 }}>
      inspected {line}
    </text>
  );
}

export function ThinkingBlock() {
  return (
    <text fg={theme.fgDim} style={{ paddingLeft: 2, marginBottom: 1 }}>
      …
    </text>
  );
}

export function MemoryBlock(props: { section: string }) {
  return (
    <text fg={theme.fgDim} style={{ paddingLeft: 2, marginBottom: 1 }}>
      memory · {props.section}
    </text>
  );
}

export function ErrorBlock(props: { message: string }) {
  return (
    <box
      style={{
        marginBottom: 1,
        marginLeft: 1,
        marginRight: 1,
        border: true,
        borderStyle: "rounded",
        borderColor: theme.errorAccent,
        padding: 1,
      }}
    >
      <text fg={theme.errorAccent}>{props.message}</text>
    </box>
  );
}
