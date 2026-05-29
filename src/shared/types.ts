export type SafetyMode = "safe" | "confirm" | "yolo";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export const MAX_CHAT_HISTORY = 20;

export type SqlKind =
  | "READ"
  | "WRITE"
  | "DDL"
  | "TRANSACTION"
  | "MULTI"
  | "EMPTY"
  | "UNKNOWN";

export type GateAction = "ALLOW" | "DENY" | "CONFIRM";

export interface DbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

export interface AppConfig {
  default_model: string;
  default_mode: SafetyMode;
  active_profile?: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default: string | null;
  comment: string;
}

export interface SchemaForeignKey {
  from_table: string;
  from_column: string;
  to_table: string;
  to_column: string;
}

export interface SchemaIndex {
  table: string;
  name: string;
  columns: string[];
  is_unique: boolean;
}

export interface SchemaTable {
  name: string;
  engine: string;
  row_count: number;
  columns: SchemaColumn[];
  foreign_keys: SchemaForeignKey[];
  indexes: SchemaIndex[];
  incoming_fks: SchemaForeignKey[];
}

export interface Schema {
  database: string;
  introspected_at: string;
  tables: SchemaTable[];
}

export interface SqlReadResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowcount: number;
  truncated: boolean;
}

export interface SqlWriteResult {
  ok: boolean;
  rowcount?: number;
  error?: string;
}

export type AgentEvent =
  | { type: "thinking" }
  | { type: "schema"; tables: string[] }
  | { type: "execution"; tool: "run_sql_read" | "run_sql_write"; sql: string; result?: SqlReadResult; writeResult?: SqlWriteResult; error?: string; durationMs?: number }
  | { type: "memory"; section: string }
  | { type: "answer-chunk"; content: string }
  | { type: "answer-done"; content: string }
  | { type: "answer-clear" }
  | { type: "usage"; promptTokens: number; completionTokens: number }
  | { type: "error"; message: string }
  | { type: "done" };

export type TranscriptBlock =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "thinking" }
  | { id: string; kind: "schema"; tables: { name: string; colCount: number }[] }
  | { id: string; kind: "execution"; tool: "run_sql_read" | "run_sql_write"; sql: string; result?: SqlReadResult; writeResult?: SqlWriteResult; error?: string; durationMs?: number; mode?: SafetyMode }
  | { id: string; kind: "memory"; section: string }
  | { id: string; kind: "answer"; content: string; streaming: boolean }
  | { id: string; kind: "error"; message: string };

export interface SessionStats {
  queries: number;
  errors: number;
  elapsedMs: number;
  promptTokens: number;
  completionTokens: number;
}

export interface ConfirmRequest {
  id: string;
  reason: string;
  sql: string;
}

export const DEFAULT_MODEL = "openai/gpt-5.4-nano";
export const MAX_AGENT_STEPS = 10;
export const MAX_RESULT_BYTES = 50_000;
export const MAX_CELL_DISPLAY = 60;
export const DEFAULT_READ_LIMIT = 100;
/**
 * Hard server-side ceiling on rows returned by a read query, enforced via
 * SQL_SELECT_LIMIT regardless of the SQL text. This is the memory-safety net
 * that backstops ensureLimit(), which can be skipped when the query already
 * contains the token "LIMIT" (e.g. inside a subquery).
 */
export const MAX_READ_ROWS = 5_000;
