import { theme } from "../theme.ts";

const ITEMS = [
  { label: "/help — show commands", cmd: "/help" },
  { label: "/profiles — list profiles", cmd: "/profiles" },
  { label: "/mode safe|confirm|yolo", cmd: "/mode safe" },
  { label: "/refresh — refresh schema", cmd: "/refresh" },
  { label: "/clear — clear chat", cmd: "/clear" },
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

export function HelpOverlay() {
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
      <text fg={theme.fgMuted}>ctrl+p palette · ctrl+l clear · ctrl+r refresh · ctrl+c quit</text>
      <text fg={theme.fgMuted}>tab accept suggestion · enter submit</text>
    </box>
  );
}
