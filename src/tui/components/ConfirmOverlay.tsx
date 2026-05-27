import { theme, syntaxStyle } from "../theme.ts";
import type { ConfirmRequest } from "../../shared/types.ts";

export function ConfirmOverlay(props: {
  request: ConfirmRequest;
  onConfirm: (approved: boolean) => void;
}) {
  return (
    <box
      style={{
        position: "absolute",
        left: 4,
        right: 4,
        top: "30%",
        border: true,
        borderStyle: "rounded",
        borderColor: theme.danger,
        backgroundColor: theme.bgElevated,
        padding: 1,
        flexDirection: "column",
        gap: 1,
      }}
    >
      <text fg={theme.danger}>
        <b>Confirm destructive SQL</b>
      </text>
      <text fg={theme.fgDim}>{props.request.reason}</text>
      <scrollbox style={{ maxHeight: 14 }}>
        <code
          wrapMode="none"
          content={props.request.sql}
          filetype="sql"
          syntaxStyle={syntaxStyle}
        />
      </scrollbox>
      <box style={{ flexDirection: "row", gap: 2 }}>
        <text fg={theme.safe}>[y] Run</text>
        <text fg={theme.danger}>[n] Cancel</text>
      </box>
    </box>
  );
}
