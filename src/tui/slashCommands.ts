export interface SlashCommandDef {
  /** Prefix used for filtering (e.g. `/new`). */
  match: string;
  /** Value inserted into the prompt when selected. */
  cmd: string;
  description: string;
  /** When true, a trailing space is appended so arg completion can continue. */
  needsArg?: boolean;
}

/** Top-level slash commands. */
export const SLASH_COMMAND_DEFS: SlashCommandDef[] = [
  { match: "/new", cmd: "/new", description: "create new chat" },
  { match: "/chat", cmd: "/chat", description: "create new chat" },
  { match: "/clear", cmd: "/clear", description: "clear chat history" },
  { match: "/use", cmd: "/use", description: "switch database", needsArg: true },
  { match: "/connect", cmd: "/connect", description: "switch database", needsArg: true },
  { match: "/profile", cmd: "/profile", description: "manage connections", needsArg: true },
  { match: "/project", cmd: "/project", description: "group profiles", needsArg: true },
  { match: "/profiles", cmd: "/profiles", description: "list saved connections" },
  { match: "/mode", cmd: "/mode", description: "set safety mode", needsArg: true },
  { match: "/model", cmd: "/model", description: "set OpenRouter model", needsArg: true },
  { match: "/schema", cmd: "/schema", description: "show table schema", needsArg: true },
  { match: "/refresh", cmd: "/refresh", description: "refresh cached schema" },
  { match: "/memory", cmd: "/memory", description: "show agent memory file" },
  { match: "/help", cmd: "/help", description: "show command help" },
  { match: "/quit", cmd: "/quit", description: "exit AskSQL" },
  { match: "/exit", cmd: "/exit", description: "exit AskSQL" },
];

export const PROFILE_COMMAND_DEFS: SlashCommandDef[] = [
  { match: "new", cmd: "new", description: "add MySQL connection" },
  { match: "list", cmd: "list", description: "list saved connections" },
];

export const PROJECT_COMMAND_DEFS: SlashCommandDef[] = [
  { match: "new", cmd: "new", description: "create project from profiles" },
  { match: "list", cmd: "list", description: "list projects" },
  { match: "use", cmd: "use", description: "switch to project chat", needsArg: true },
  { match: "add", cmd: "add", description: "add profile to active project", needsArg: true },
];

export const MODE_COMMAND_DEFS: SlashCommandDef[] = [
  { match: "safe", cmd: "safe", description: "read-only queries" },
  { match: "confirm", cmd: "confirm", description: "confirm writes" },
  { match: "yolo", cmd: "yolo", description: "run writes without confirm" },
];

/** @deprecated Use SLASH_COMMAND_DEFS — kept for prefix lists. */
export const SLASH_COMMANDS = SLASH_COMMAND_DEFS.map((d) => d.match);

export const PROFILE_SUBCOMMANDS = PROFILE_COMMAND_DEFS.map((d) => d.match) as readonly string[];

export const SLASH_HELP = `
**Chat**
/new · /chat · /clear — start a fresh conversation (agent forgets prior turns)
ctrl+l — same as /new

**Database**
/profile new — add a MySQL connection
/profile list · /profiles — list saved connections
/use <name> — switch database (starts a new chat)
/project new — group profiles for cross-DB chat
/project use <name> — chat across project profiles

**Session**
/mode safe|confirm|yolo · /model <id>
/schema [table] · /refresh · /memory
/help · /quit
`.trim();

export function slashInsertValue(def: SlashCommandDef): string {
  return def.needsArg ? `${def.cmd} ` : def.cmd;
}
