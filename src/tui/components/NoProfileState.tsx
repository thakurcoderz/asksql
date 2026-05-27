import { theme } from "../theme.ts";

export function NoProfileState(props: { profiles: string[] }) {
  const hasProfiles = props.profiles.length > 0;

  return (
    <box
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        gap: 1,
        padding: 2,
      }}
    >
      <text fg={theme.fg}>
        <b>Connect a database to start</b>
      </text>
      {hasProfiles ? (
        <>
          <text fg={theme.fgMuted}>Ask in plain English once a connection is active.</text>
          <text fg={theme.fgDim}>/use &lt;name&gt; — switch database</text>
          <text fg={theme.fgDim}>/profile list — saved connections</text>
          <text fg={theme.fgDim}>/profile new — add another database</text>
        </>
      ) : (
        <>
          <text fg={theme.fgMuted}>No connections yet.</text>
          <text fg={theme.accent}>/profile new — set up MySQL</text>
          <text fg={theme.fgDim}>/help — all commands</text>
        </>
      )}
    </box>
  );
}
