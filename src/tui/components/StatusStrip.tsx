import { theme, modeColor } from "../theme.ts";
import type { SafetyMode } from "../../shared/types.ts";
import { PROJECT_COST_WARN_THRESHOLD } from "../../shared/types.ts";

export function StatusStrip(props: {
  scopeKind: "profile" | "project" | "none";
  profile: string | null;
  project: string | null;
  projectProfileCount: number;
  mode: SafetyMode;
  model: string;
}) {
  let scopeLabel = "none";
  if (props.scopeKind === "profile") {
    scopeLabel = props.profile ?? "none";
  } else if (props.scopeKind === "project") {
    scopeLabel = `project:${props.project ?? "?"} (${props.projectProfileCount} DBs)`;
  }

  const costWarn =
    props.scopeKind === "project" &&
    props.projectProfileCount > PROJECT_COST_WARN_THRESHOLD;

  return (
    <box
      style={{
        flexDirection: "row",
        width: "100%",
        height: 1,
        flexShrink: 0,
        paddingLeft: 1,
        paddingRight: 1,
        justifyContent: "space-between",
      }}
    >
      <text>
        <span fg={theme.fgMuted}>asksql</span>
        <span fg={theme.fgDim}> · </span>
        <span fg={props.scopeKind === "project" ? theme.accent : theme.fg}>{scopeLabel}</span>
        {costWarn && (
          <>
            <span fg={theme.fgDim}> · </span>
            <span fg={theme.warn}>↑tokens</span>
          </>
        )}
        <span fg={theme.fgDim}> · </span>
        <span fg={modeColor(props.mode)}>{props.mode}</span>
        <span fg={theme.fgDim}> · </span>
        <span fg={theme.fgMuted}>{props.model}</span>
      </text>
      <text fg={theme.fgDim}>/help</text>
    </box>
  );
}
