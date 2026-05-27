import type { SqlReadResult } from "../../shared/types.ts";

const GAP = 3;
const MIN_COL = 6;

function columnPriority(name: string, index: number): number {
  const n = name.toLowerCase();
  if (n === "id") return 100;
  if (n.includes("email")) return 95;
  if (n.endsWith("_count") || n === "user_count") return 92;
  if (n.includes("role") && n.includes("name") && n !== "role_display_name") return 84;
  if (n === "role_display_name") return 72;
  if (n.includes("name")) return 88;
  if (n.includes("status") || n.includes("active")) return 75;
  if (n.endsWith("_at") || n.includes("date") || n.includes("time")) return 20;
  return 60 - index;
}

function columnMaxWidth(name: string): number {
  const n = name.toLowerCase();
  if (n === "id" || n.endsWith("_id")) return 10;
  if (n.includes("email")) return 48;
  if (n === "role_display_name") return 18;
  if (n.includes("role") && n.includes("name")) return 22;
  if (n.endsWith("_at") || n.includes("date") || n.includes("time")) return 19;
  return 28;
}

function formatCell(value: unknown, width: number): string {
  let s: string;
  if (value instanceof Date) {
    s = value.toISOString().slice(0, 19).replace("T", " ");
  } else if (value === null || value === undefined) {
    s = "";
  } else {
    s = String(value);
  }
  if (s.length > width) return s.slice(0, Math.max(1, width - 1)) + "…";
  return s.padEnd(width);
}

export function layoutResultTable(
  result: SqlReadResult,
  tableWidth: number,
): {
  header: string;
  rows: string[];
  hiddenColumns: string[];
} | null {
  const { columns, rows } = result;
  if (columns.length === 0) return null;

  const ranked = columns
    .map((c, i) => ({ c, p: columnPriority(c, i), i }))
    .sort((a, b) => b.p - a.p || a.i - b.i);

  const visible: string[] = [];
  let used = 0;

  for (const { c } of ranked) {
    const next = visible.length > 0 ? GAP + MIN_COL : MIN_COL;
    if (used + next > tableWidth && visible.length > 0) break;
    visible.push(c);
    used += next;
  }

  if (visible.length === 0) visible.push(ranked[0]!.c);
  visible.sort((a, b) => columns.indexOf(a) - columns.indexOf(b));

  const hiddenColumns = columns.filter((c) => !visible.includes(c));

  const natural = visible.map((col) => {
    const headerLen = col.length;
    const dataLen = rows.reduce(
      (m, row) => Math.max(m, formatCell(row[col], MIN_COL).trim().length),
      0,
    );
    return Math.max(headerLen, dataLen, MIN_COL);
  });

  let widths = natural.map((w, i) => Math.min(w, columnMaxWidth(visible[i]!)));
  if (/^(id|_id)$/i.test(visible[0]!)) {
    widths[0] = Math.min(widths[0]!, columnMaxWidth(visible[0]!));
  }

  let total = widths.reduce((a, w, i) => a + w + (i > 0 ? GAP : 0), 0);
  while (total > tableWidth && widths.length > 1) {
    const idx = widths.indexOf(Math.max(...widths));
    widths[idx] = Math.max(MIN_COL, widths[idx]! - 2);
    total = widths.reduce((a, w, i) => a + w + (i > 0 ? GAP : 0), 0);
  }

  if (total < tableWidth && visible.length > 0) {
    let remaining = tableWidth - total;
    const expandOrder = visible
      .map((col, i) => ({ i, p: columnPriority(col, columns.indexOf(col)) }))
      .sort((a, b) => b.p - a.p);
    for (const { i } of expandOrder) {
      if (remaining <= 0) break;
      const cap = columnMaxWidth(visible[i]!);
      const room = cap - widths[i]!;
      if (room <= 0) continue;
      const add = Math.min(remaining, room);
      widths[i]! += add;
      remaining -= add;
    }
    if (remaining > 0) {
      widths[visible.length - 1]! += remaining;
    }
    total = tableWidth;
  }

  const padRow = (cells: unknown[]) =>
    cells.map((cell, i) => formatCell(cell, widths[i]!)).join(" ".repeat(GAP));

  const header = padRow(visible);
  const body = rows.map((row) => padRow(visible.map((col) => row[col])));

  return { header, rows: body, hiddenColumns };
}
