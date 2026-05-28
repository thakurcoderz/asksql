import type {
  SafetyMode,
  TranscriptBlock,
  ConfirmRequest,
} from "../../shared/types.ts";

export interface AppState {
  scopeKind: "profile" | "project" | "none";
  profile: string | null;
  project: string | null;
  projectProfiles: string[];
  database: string;
  mode: SafetyMode;
  model: string;
  blocks: TranscriptBlock[];
  input: string;
  ghost: string;
  slashPickIndex: number;
  busy: boolean;
  paletteOpen: boolean;
  helpOpen: boolean;
  confirm: ConfirmRequest | null;
  inspectorOpen: boolean;
  profileSetupOpen: boolean;
  projectSetupOpen: boolean;
}

export type AppAction =
  | { type: "set-input"; value: string; ghost?: string }
  | { type: "accept-ghost" }
  | { type: "set-slash-pick"; index: number }
  | { type: "accept-slash-suggestion"; value: string }
  | { type: "clear" }
  | { type: "set-mode"; mode: SafetyMode }
  | { type: "set-model"; model: string }
  | { type: "set-profile"; profile: string; database: string }
  | {
      type: "set-project";
      project: string;
      profiles: string[];
    }
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
  | { type: "toggle-help" }
  | { type: "set-confirm"; confirm: ConfirmRequest | null }
  | { type: "set-profile-setup"; open: boolean }
  | { type: "set-project-setup"; open: boolean }
  | { type: "toggle-inspector" };

let nextId = 1;
export function uid(prefix = "b"): string {
  return `${prefix}-${nextId++}`;
}

export function canChat(state: AppState): boolean {
  if (state.scopeKind === "profile") return !!state.profile;
  if (state.scopeKind === "project") return state.projectProfiles.length > 0;
  return false;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "set-input":
      return { ...state, input: action.value, ghost: action.ghost ?? "", slashPickIndex: 0 };
    case "accept-ghost":
      if (!state.ghost) return state;
      return { ...state, input: state.ghost, ghost: "", slashPickIndex: 0 };
    case "set-slash-pick": {
      const max = Math.max(0, action.index);
      return { ...state, slashPickIndex: max };
    }
    case "accept-slash-suggestion":
      return {
        ...state,
        input: action.value,
        ghost: "",
        slashPickIndex: 0,
      };
    case "clear":
      return { ...state, blocks: [] };
    case "set-mode":
      return { ...state, mode: action.mode };
    case "set-model":
      return { ...state, model: action.model };
    case "set-profile":
      return {
        ...state,
        scopeKind: "profile",
        profile: action.profile,
        project: null,
        projectProfiles: [],
        database: action.database,
      };
    case "set-project":
      return {
        ...state,
        scopeKind: "project",
        profile: null,
        project: action.project,
        projectProfiles: action.profiles,
        database: "",
      };
    case "add-block": {
      const withoutThinking =
        action.block.kind === "thinking"
          ? state.blocks
          : state.blocks.filter((b) => b.kind !== "thinking");
      return { ...state, blocks: [...withoutThinking, action.block] };
    }
    case "sync-thinking":
      return {
        ...state,
        blocks: [
          ...state.blocks.filter((b) => b.kind !== "thinking"),
          { id: "thinking", kind: "thinking" },
        ],
      };
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
    case "toggle-help":
      return { ...state, helpOpen: !state.helpOpen };
    case "set-confirm":
      return { ...state, confirm: action.confirm };
    case "set-profile-setup":
      return { ...state, profileSetupOpen: action.open };
    case "set-project-setup":
      return { ...state, projectSetupOpen: action.open };
    case "toggle-inspector":
      return { ...state, inspectorOpen: !state.inspectorOpen };
    default:
      return state;
  }
}
