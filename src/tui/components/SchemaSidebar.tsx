import { theme } from "../theme.ts";
import type { Schema, DbConfig } from "../../shared/types.ts";
import { formatCount, relativeTime } from "../format/numbers.ts";

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  if (max <= 1) return s.slice(0, max);
  return s.slice(0, max - 1) + "…";
}

export function SchemaSidebar(props: {
  width: number;
  profile: string | null;
  conn: DbConfig | null;
  schema: Schema | null;
}) {
  const { width, profile, conn, schema } = props;
  // The scrollbox lays its vertical scrollbar out as a flex sibling of the
  // viewport, so it consumes 1 column. Budget: borders(2) + paddingX(2) +
  // scrollbar(1) + a 1-col gap so text/counts never touch the scrollbar.
  const inner = Math.max(8, width - 6);
  const tables = schema?.tables ?? [];
  const totalRows = tables.reduce((sum, t) => sum + (t.row_count || 0), 0);

  return (
    <box
      title="Schema"
      style={{
        flexDirection: "column",
        width,
        flexShrink: 0,
        height: "100%",
        minHeight: 0,
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgCard,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      {/* Connection details */}
      {conn ? (
        <box style={{ flexDirection: "column", flexShrink: 0 }}>
          <text fg={theme.accent}>{truncate(`${conn.username}@${conn.host}`, inner)}</text>
          <text fg={theme.fg}>{truncate(conn.database || profile || "—", inner)}</text>
          <text fg={theme.fgMuted}>
            {tables.length} table{tables.length === 1 ? "" : "s"} · {formatCount(totalRows)} rows
          </text>
          <text fg={theme.fgDim}>refreshed {relativeTime(schema?.introspected_at)}</text>
        </box>
      ) : (
        <text fg={theme.fgDim}>no connection</text>
      )}

      <box style={{ height: 1, flexShrink: 0 }} />
      <text fg={theme.fgDim}>{`TABLES`}</text>

      {/* Table list */}
      <scrollbox
        viewportCulling={false}
        style={{ flexGrow: 1, minHeight: 0, width: "100%", marginTop: 1 }}
      >
        <box style={{ flexDirection: "column", width: inner }}>
          {tables.length === 0 && <text fg={theme.fgDim}>—</text>}
          {tables.map((t) => {
            const rows = `~${formatCount(t.row_count || 0)}`;
            const nameMax = Math.max(4, inner - rows.length - 1);
            const cols = t.columns.map((c) => c.name).join(", ");
            const fkCount = t.foreign_keys.length;
            return (
              <box key={t.name} style={{ flexDirection: "column", marginBottom: 1 }}>
                <box style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                  <text fg={theme.fg}>{truncate(t.name, nameMax)}</text>
                  <text fg={theme.fgDim}>{rows}</text>
                </box>
                {cols && <text fg={theme.fgDim}>{truncate(cols, inner)}</text>}
                {fkCount > 0 && (
                  <text fg={theme.sqlAccent}>→ {fkCount} fk{fkCount === 1 ? "" : "s"}</text>
                )}
              </box>
            );
          })}
        </box>
      </scrollbox>
    </box>
  );
}
