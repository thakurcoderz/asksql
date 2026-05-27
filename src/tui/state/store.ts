import type {
  SafetyMode,
  TranscriptBlock,
  ConfirmRequest,
} from "../../shared/types.ts";

export interface AppState {
  profile: string | null;
  database: string;
  mode: SafetyMode;
  model: string;
  blocks: TranscriptBlock[];
  input: string;
  ghost: string;
  busy: boolean;
  paletteOpen: boolean;
  helpOpen: boolean;
  confirm: ConfirmRequest | null;
  inspectorOpen: boolean;
}

export type AppAction =
  | { type: "set-input"; value: string; ghost?: string }
  | { type: "accept-ghost" }
  | { type: "clear" }
  | { type: "set-mode"; mode: SafetyMode }
  | { type: "set-model"; model: string }
  | { type: "set-profile"; profile: string; database: string }
  | { type: "add-block"; block: TranscriptBlock }
  | { type: "sync-thinking" }
  | { type: "clear-thinking" }
  | { type: "update-block"; id: string; patch: Partial<TranscriptBlock> }
  | { type: "append-answer"; id: string; chunk: string }
  | { type: "finalize-answer"; id: string; content: string }
  | { type: "clear-answer"; id: string }
  | { type: "set-busy"; busy: boolean }
  | { type: "set-palette"; open: boolean }
  | { type: "set-help"; open: boolean }
  | { type: "set-confirm"; confirm: ConfirmRequest | null }
  | { type: "toggle-inspector" };

let nextId = 1;
export function uid(prefix = "b"): string {
  return `${prefix}-${nextId++}`;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "set-input":
      return { ...state, input: action.value, ghost: action.ghost ?? "" };
    case "accept-ghost":
      if (!state.ghost) return state;
      return { ...state, input: state.ghost, ghost: "" };
    case "clear":
      return { ...state, blocks: [] };
    case "set-mode":
      return { ...state, mode: action.mode };
    case "set-model":
      return { ...state, model: action.model };
    case "set-profile":
      return { ...state, profile: action.profile, database: action.database };
    case "add-block": {
      const withoutThinking =
        action.block.kind === "thinking"
          ? state.blocks
          : state.blocks.filter((b) => b.kind !== "thinking");
      return { ...state, blocks: [...withoutThinking, action.block] };
    }
    case "sync-thinking": {
      const without = state.blocks.filter((b) => b.kind !== "thinking");
      return {
        ...state,
        blocks: [...without, { id: "thinking", kind: "thinking" }],
      };
    }
    case "clear-thinking":
      return { ...state, blocks: state.blocks.filter((b) => b.kind !== "thinking") };
    case "update-block":
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.id ? ({ ...b, ...action.patch } as TranscriptBlock) : b,
        ),
      };
    case "append-answer":
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.id && b.kind === "answer"
            ? { ...b, content: b.content + action.chunk }
            : b,
        ),
      };
    case "finalize-answer":
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.id && b.kind === "answer"
            ? { ...b, content: action.content, streaming: false }
            : b,
        ),
      };
    case "clear-answer":
      return {
        ...state,
        blocks: state.blocks.filter((b) => b.id !== action.id),
      };
    case "set-busy":
      return { ...state, busy: action.busy };
    case "set-palette":
      return { ...state, paletteOpen: action.open };
    case "set-help":
      return { ...state, helpOpen: action.open };
    case "set-confirm":
      return { ...state, confirm: action.confirm };
    case "toggle-inspector":
      return { ...state, inspectorOpen: !state.inspectorOpen };
    default:
      return state;
  }
}
