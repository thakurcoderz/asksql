import { theme } from "../theme.ts";

const EXAMPLES = [
  "How many users signed up this week?",
  "What tables relate to orders?",
  "Show the 5 most recent failed jobs",
];

export function EmptyState(props: { database: string; onSelect: (q: string) => void }) {
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
        Ask anything about <span fg={theme.accent}>{props.database || "your database"}</span>
      </text>
      {EXAMPLES.map((ex) => (
        <text key={ex} fg={theme.fgDim}>
          · {ex}
        </text>
      ))}
    </box>
  );
}
