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
  active_project?: string;
}

export interface Project {
  name: string;
  description?: string;
  profiles: string[];
}

export type AgentScope =
  | { kind: "profile"; profileName: string }
  | { kind: "project"; projectName: string; profileNames: string[] };

export type ActiveScope =
  | { kind: "profile"; name: string }
  | { kind: "project"; name: string; profiles: string[] }
  | null;

export const MAX_PROJECT_PROFILES = 8;
export const MAX_PROJECT_MEMORY_CHARS = 2000;
export const PROJECT_COST_WARN_THRESHOLD = 3;

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
  | { type: "schema"; tables: string[]; profile?: string }
  | {
      type: "execution";
      tool: "run_sql_read" | "run_sql_write";
      sql: string;
      profile?: string;
      result?: SqlReadResult;
      writeResult?: SqlWriteResult;
      error?: string;
    }
  | { type: "memory"; section: string; profile?: string }
  | { type: "answer-chunk"; content: string }
  | { type: "answer-done"; content: string }
  | { type: "answer-clear" }
  | { type: "error"; message: string }
  | { type: "done" };

export type TranscriptBlock =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "thinking" }
  | { id: string; kind: "schema"; tables: { name: string; colCount: number }[]; profile?: string }
  | {
      id: string;
      kind: "execution";
      tool: "run_sql_read" | "run_sql_write";
      sql: string;
      profile?: string;
      result?: SqlReadResult;
      writeResult?: SqlWriteResult;
      error?: string;
    }
  | { id: string; kind: "memory"; section: string; profile?: string }
  | { id: string; kind: "answer"; content: string; streaming: boolean }
  | { id: string; kind: "error"; message: string };

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
