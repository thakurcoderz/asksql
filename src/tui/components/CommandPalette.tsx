import { theme } from "../theme.ts";

const ITEMS = [
  { label: "/new — fresh chat (forget prior questions)", cmd: "/new" },
  { label: "/profile new — add MySQL connection", cmd: "/profile new" },
  { label: "/use <name> — switch database", cmd: "/use " },
  { label: "/profile list — list connections", cmd: "/profile list" },
  { label: "/mode safe|confirm|yolo", cmd: "/mode safe" },
  { label: "/schema [table]", cmd: "/schema" },
  { label: "/refresh — refresh schema", cmd: "/refresh" },
  { label: "/help — all commands", cmd: "/help" },
  { label: "/quit — exit", cmd: "/quit" },
];

export function CommandPalette(props: {
  filter: string;
  onSelect: (cmd: string) => void;
  onClose: () => void;
}) {
  const f = props.filter.toLowerCase();
  const items = ITEMS.filter(
    (i) => !f || i.label.toLowerCase().includes(f) || i.cmd.toLowerCase().includes(f),
  );

  return (
    <box
      style={{
        position: "absolute",
        left: 4,
        right: 4,
        top: 4,
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgElevated,
        padding: 1,
        flexDirection: "column",
        gap: 0,
      }}
    >
      <text fg={theme.accent}>
        <b>Command palette</b>
      </text>
      {items.map((item) => (
        <text key={item.cmd} fg={theme.fg}>
          {item.label}
        </text>
      ))}
      <text fg={theme.fgDim}>esc close</text>
    </box>
  );
}

export function HelpOverlay(props: {
  hasProfile: boolean;
  scopeKind?: "profile" | "project" | "none";
}) {
  return (
    <box
      style={{
        position: "absolute",
        left: 4,
        right: 4,
        bottom: 4,
        border: true,
        borderColor: theme.border,
        backgroundColor: theme.bgElevated,
        padding: 1,
        flexDirection: "column",
      }}
    >
      <text fg={theme.accent}>
        <b>Chat</b>
      </text>
      <text fg={theme.fgMuted}>/new — new conversation (clears context for the agent)</text>
      <text fg={theme.accent}>
        <b>Database</b>
      </text>
      <text fg={theme.fgMuted}>/profile new · /profile list · /use &lt;name&gt;</text>
      <text fg={theme.fgMuted}>/project new · /project list · /project use &lt;name&gt;</text>
      {!props.hasProfile && (
        <text fg={theme.warn}>Ask questions after /profile new or /use &lt;name&gt;.</text>
      )}
      <text fg={theme.fgDim}>ctrl+p palette · ctrl+l new chat · ctrl+r refresh schema · ctrl+c quit</text>
      <text fg={theme.fgDim}>esc close · /help toggle</text>
    </box>
  );
}
