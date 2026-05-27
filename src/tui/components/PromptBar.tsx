import { useEffect, useRef } from "react";
import { theme } from "../theme.ts";
import { PROMPT_ROWS } from "../layout.ts";

export function PromptBar(props: {
  value: string;
  ghost: string;
  disabled: boolean;
  inputKey: number;
  slashActive?: boolean;
  placeholder?: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  const current = useRef(props.value);
  const defaultPlaceholder = "Ask a question, or type /help";

  useEffect(() => {
    current.current = props.value;
  }, [props.value]);

  return (
    <box
      style={{
        width: "100%",
        height: PROMPT_ROWS,
        flexShrink: 0,
        border: props.slashActive ? ["left", "top", "right", "bottom"] : true,
        borderColor: props.slashActive ? theme.accent : theme.border,
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
          value={props.value}
          placeholder={
            props.slashActive
              ? undefined
              : props.ghost && props.ghost.startsWith(props.value)
                ? props.ghost
                : props.placeholder ?? defaultPlaceholder
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
