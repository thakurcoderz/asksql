import { theme } from "../theme.ts";
import { PROMPT_ROWS } from "../layout.ts";
import type { SlashSuggestion } from "../autocomplete.ts";

const MAX_VISIBLE = 14;

function commandColumnWidth(items: SlashSuggestion[]): number {
  return Math.max(8, ...items.map((item) => item.command.length));
}

export function SlashAutocomplete(props: {
  suggestions: SlashSuggestion[];
  selectedIndex: number;
}) {
  const items = props.suggestions.slice(0, MAX_VISIBLE);
  if (items.length === 0) return null;

  const cmdWidth = commandColumnWidth(items);
  const selected = items[props.selectedIndex] ?? items[0]!;

  return (
    <box
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: PROMPT_ROWS,
        flexDirection: "column",
        width: "100%",
      }}
    >
      <box
        style={{
          flexDirection: "column",
          border: ["left", "right"],
          borderColor: theme.fgDim,
          backgroundColor: theme.bg,
          paddingLeft: 1,
          paddingRight: 1,
          width: "100%",
        }}
      >
        {items.map((item, index) => {
          const picked = index === props.selectedIndex;
          return (
            <box
              key={`${item.value}-${index}`}
              style={{
                flexDirection: "row",
                width: "100%",
                backgroundColor: picked ? theme.slashPick : undefined,
              }}
            >
              <box style={{ width: cmdWidth + 1, flexShrink: 0 }}>
                <text fg={picked ? theme.slashPickFg : theme.fg}>{item.command}</text>
              </box>
              <box style={{ flexGrow: 1, flexShrink: 1 }}>
                <text fg={picked ? theme.slashPickFg : theme.fgMuted}>{item.description}</text>
              </box>
            </box>
          );
        })}
        <box
          style={{
            flexDirection: "row",
            width: "100%",
            justifyContent: "flex-end",
            gap: 2,
            marginTop: 0,
          }}
        >
          <text fg={theme.fgDim}>tab {selected.command.split(/\s+/)[0]}</text>
          <text fg={theme.fgDim}>↑↓ navigate</text>
        </box>
      </box>
    </box>
  );
}
