import type { GateAction, SafetyMode, SqlKind } from "../../shared/types.ts";

const READ_KEYWORDS = new Set([
  "SELECT", "SHOW", "EXPLAIN", "DESCRIBE", "DESC", "WITH",
]);

const WRITE_KEYWORDS = new Set([
  "INSERT", "UPDATE", "DELETE", "REPLACE",
]);

const DDL_KEYWORDS = new Set([
  "CREATE", "ALTER", "DROP", "TRUNCATE", "RENAME",
]);

const TRANSACTION_KEYWORDS = new Set([
  "BEGIN", "COMMIT", "ROLLBACK", "START",
]);

export function stripComments(sql: string): string {
  let result = "";
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (sql[i] === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    result += sql[i];
    i++;
  }
  return result;
}

export function splitStatements(sql: string): string[] {
  const cleaned = stripComments(sql);
  const parts = cleaned.split(";").map((s) => s.trim()).filter(Boolean);
  return parts;
}

function firstKeyword(statement: string): string {
  const cleaned = stripComments(statement).trim();
  const match = cleaned.match(/^[\s(]*(\w+)/i);
  return match?.[1]?.toUpperCase() ?? "";
}

function classifyStatement(statement: string): SqlKind {
  const trimmed = stripComments(statement).trim();
  if (!trimmed) return "EMPTY";

  const upper = trimmed.toUpperCase();

  if (/\bINTO\s+(OUTFILE|DUMPFILE)\b/i.test(upper)) return "WRITE";

  const kw = firstKeyword(trimmed);

  if (READ_KEYWORDS.has(kw)) {
    if (kw === "WITH") {
      return /\bSELECT\b/i.test(upper) ? "READ" : "UNKNOWN";
    }
    return "READ";
  }
  if (WRITE_KEYWORDS.has(kw)) return "WRITE";
  if (DDL_KEYWORDS.has(kw)) return "DDL";
  if (TRANSACTION_KEYWORDS.has(kw)) {
    if (/^START\s+TRANSACTION/i.test(upper) || kw === "BEGIN" || kw === "COMMIT" || kw === "ROLLBACK") {
      return "TRANSACTION";
    }
  }
  if (/^SET\s+TRANSACTION/i.test(upper)) return "TRANSACTION";

  return "UNKNOWN";
}

export function classifySql(sql: string): SqlKind {
  const trimmed = sql.trim();
  if (!trimmed || trimmed === ";") return "EMPTY";

  const statements = splitStatements(trimmed);
  if (statements.length === 0) return "EMPTY";
  if (statements.length > 1) return "MULTI";

  return classifyStatement(statements[0]!);
}

export function gateAction(mode: SafetyMode, kind: SqlKind): GateAction {
  if (kind === "MULTI") return "DENY";

  switch (mode) {
    case "safe":
      if (kind === "READ") return "ALLOW";
      return "DENY";
    case "confirm":
      if (kind === "READ") return "ALLOW";
      if (kind === "WRITE" || kind === "DDL" || kind === "UNKNOWN") return "CONFIRM";
      return "DENY";
    case "yolo":
      if (kind === "READ" || kind === "WRITE" || kind === "DDL" || kind === "UNKNOWN") return "ALLOW";
      return "DENY";
    default:
      return "DENY";
  }
}

export function enforceReadOnly(sql: string): { ok: true } | { ok: false; error: string } {
  const kind = classifySql(sql);
  if (kind !== "READ") {
    return { ok: false, error: `run_sql_read only accepts READ statements; got ${kind}` };
  }
  return { ok: true };
}

export function ensureLimit(sql: string, limit = 100): string {
  const upper = stripComments(sql).toUpperCase();
  if (/\bLIMIT\b/.test(upper)) return sql;
  return `${sql.trim().replace(/;?\s*$/, "")} LIMIT ${limit}`;
}

export function truncateCell(value: unknown, max = 60): string {
  let str: string;
  if (value instanceof Date) {
    str = value.toISOString().slice(0, 19).replace("T", " ");
  } else if (value === null || value === undefined) {
    str = "";
  } else {
    str = String(value);
  }
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}
