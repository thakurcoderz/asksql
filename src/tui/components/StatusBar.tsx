import { theme, modeColor } from "../theme.ts";
import type { SafetyMode, SessionStats } from "../../shared/types.ts";
import { formatCount, formatDuration } from "../format/numbers.ts";

export function StatusBar(props: {
  profile: string | null;
  mode: SafetyMode;
  model: string;
  stats: SessionStats;
  busy: boolean;
}) {
  const { stats } = props;
  const tokens = stats.promptTokens + stats.completionTokens;
  const sep = <span fg={theme.fgDim}> · </span>;

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
        backgroundColor: theme.bgElevated,
      }}
    >
      <text>
        <span fg={theme.fgMuted}>asksql</span>
        {sep}
        <span fg={theme.fg}>{props.profile ?? "no connection"}</span>
        {sep}
        <span fg={modeColor(props.mode)}>{props.mode}</span>
        {sep}
        <span fg={theme.fgMuted}>{props.model}</span>
      </text>
      <text>
        {props.busy && <span fg={theme.warn}>working… · </span>}
        <span fg={theme.fg}>{stats.queries}</span>
        <span fg={theme.fgDim}> queries · </span>
        <span fg={stats.errors > 0 ? theme.danger : theme.fg}>{stats.errors}</span>
        <span fg={theme.fgDim}> err · </span>
        <span fg={theme.fg}>{formatDuration(stats.elapsedMs)}</span>
        {tokens > 0 && (
          <>
            <span fg={theme.fgDim}> · </span>
            <span fg={theme.fgMuted}>{formatCount(tokens)} tok</span>
          </>
        )}
        <span fg={theme.fgDim}> · /help</span>
      </text>
    </box>
  );
}
