import { useMemo } from "react";
import { useTerminalDimensions } from "@opentui/react";
import { theme } from "../theme.ts";
import type { SqlReadResult } from "../../shared/types.ts";
import { layoutResultTable } from "../format/tableLayout.ts";

export function ResultTable(props: { result: SqlReadResult }) {
  const { width: termWidth } = useTerminalDimensions();
  const tableWidth = Math.max(32, termWidth - 8);

  const layout = useMemo(
    () => layoutResultTable(props.result, tableWidth),
    [props.result, tableWidth],
  );

  if (!layout || props.result.rowcount === 0) {
    return <text fg={theme.fgDim}>No rows</text>;
  }

  return (
    <box style={{ flexDirection: "column", width: "100%" }}>
      <box style={{ backgroundColor: theme.bgElevated, paddingLeft: 1, paddingRight: 1 }}>
        <text fg={theme.sqlAccent}>
          <b>{layout.header}</b>
        </text>
      </box>

      {layout.rows.map((line, ri) => (
        <box
          key={ri}
          style={{
            paddingLeft: 1,
            paddingRight: 1,
            backgroundColor: ri % 2 === 0 ? "transparent" : theme.bgElevated,
          }}
        >
          <text fg={theme.fg}>{line}</text>
        </box>
      ))}

      {layout.hiddenColumns.length > 0 && (
        <text fg={theme.fgDim} style={{ paddingLeft: 1, marginTop: 1 }}>
          +{layout.hiddenColumns.length} columns: {layout.hiddenColumns.slice(0, 3).join(", ")}
          {layout.hiddenColumns.length > 3 ? "…" : ""}
        </text>
      )}

      {props.result.truncated && (
        <text fg={theme.fgDim} style={{ paddingLeft: 1 }}>
          {props.result.rowcount} rows (truncated)
        </text>
      )}
    </box>
  );
}
