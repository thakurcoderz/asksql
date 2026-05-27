import { theme, modeColor } from "../theme.ts";
import type { SafetyMode } from "../../shared/types.ts";

export function StatusStrip(props: {
  profile: string | null;
  mode: SafetyMode;
  model: string;
}) {
  const profileLabel = props.profile ?? "none";
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
        <span fg={theme.fg}>{profileLabel}</span>
        <span fg={theme.fgDim}> · </span>
        <span fg={modeColor(props.mode)}>{props.mode}</span>
        <span fg={theme.fgDim}> · </span>
        <span fg={theme.fgMuted}>{props.model}</span>
      </text>
      <text fg={theme.fgDim}>/help</text>
    </box>
  );
}
