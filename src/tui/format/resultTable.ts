import type { SqlReadResult } from "../../shared/types.ts";

function escapeCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .replace(/\r/g, "");
}

export function resultToMarkdown(result: SqlReadResult): string {
  if (result.rowcount === 0 || result.columns.length === 0) {
    return "_No rows returned._";
  }

  const header = result.columns.join(" | ");
  const sep = result.columns.map(() => "---").join(" | ");
  const body = result.rows.map((row) =>
    result.columns.map((col) => escapeCell(row[col])).join(" | "),
  );

  const lines = [header, sep, ...body];
  if (result.truncated) {
    lines.push("", `_Showing ${result.rowcount} rows (truncated)_`);
  }
  return lines.join("\n");
}

export function sqlOneLine(sql: string, max = 72): string {
  const flat = sql.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return flat.slice(0, max - 1) + "…";
}
