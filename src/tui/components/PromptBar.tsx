import { useRef } from "react";
import { theme } from "../theme.ts";
import { PROMPT_ROWS } from "../layout.ts";

export function PromptBar(props: {
  value: string;
  ghost: string;
  disabled: boolean;
  inputKey: number;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  const current = useRef(props.value);

  return (
    <box
      style={{
        width: "100%",
        height: PROMPT_ROWS,
        flexShrink: 0,
        border: true,
        borderColor: theme.border,
        paddingLeft: 1,
        paddingRight: 1,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <text fg={theme.accent}>› </text>
      <box style={{ flexGrow: 1 }}>
        <input
          key={props.inputKey}
          placeholder={
            props.ghost && props.ghost.startsWith(props.value)
              ? props.ghost
              : "Ask a question, or type /help"
          }
          focused={!props.disabled}
          onInput={(v) => {
            current.current = v;
            props.onChange(v);
          }}
          onSubmit={() => props.onSubmit(current.current)}
          style={{ width: "100%" }}
        />
      </box>
    </box>
  );
}
