import {
  MODE_COMMAND_DEFS,
  PROFILE_COMMAND_DEFS,
  SLASH_COMMAND_DEFS,
  slashInsertValue,
  type SlashCommandDef,
} from "./slashCommands.ts";

export interface SlashSuggestion {
  /** Inserted into the prompt when the row is accepted. */
  value: string;
  /** Shown in the menu, e.g. `/new create new chat`. */
  label: string;
  /** Command token for styling. */
  command: string;
  /** Trailing description for styling. */
  description: string;
}

function suggestionFromDef(def: SlashCommandDef, prefix = ""): SlashSuggestion {
  const command = prefix ? `${prefix} ${def.match}` : def.match;
  return {
    value: prefix ? `${prefix} ${def.cmd}${def.needsArg ? " " : ""}` : slashInsertValue(def),
    label: `${command} ${def.description}`,
    command,
    description: def.description,
  };
}

function parseSlashInput(input: string): { cmd: string; arg: string; hasArg: boolean } | null {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith("/")) return null;

  const spaceIdx = trimmed.indexOf(" ");
  if (spaceIdx === -1) {
    return { cmd: trimmed.toLowerCase(), arg: "", hasArg: false };
  }

  return {
    cmd: trimmed.slice(0, spaceIdx).toLowerCase(),
    arg: trimmed.slice(spaceIdx + 1),
    hasArg: true,
  };
}

export function getSlashSuggestions(
  input: string,
  profiles: string[],
  tables: string[],
): SlashSuggestion[] {
  const parsed = parseSlashInput(input);
  if (!parsed) return [];

  const { cmd, arg, hasArg } = parsed;

  if (!hasArg) {
    const partial = cmd;
    return SLASH_COMMAND_DEFS.filter((d) => d.match.startsWith(partial)).map((d) =>
      suggestionFromDef(d),
    );
  }

  if (cmd === "/profile") {
    const partial = arg.toLowerCase();
    return PROFILE_COMMAND_DEFS.filter((d) => d.match.startsWith(partial)).map((d) =>
      suggestionFromDef(d, "/profile"),
    );
  }

  if (cmd === "/use" || cmd === "/connect") {
    const partial = arg.toLowerCase();
    return profiles
      .filter((p) => p.toLowerCase().startsWith(partial))
      .map((p) => ({
        value: `${cmd} ${p}`,
        label: `${cmd} ${p}`,
        command: `${cmd} ${p}`,
        description: "switch database",
      }));
  }

  if (cmd === "/mode") {
    const partial = arg.toLowerCase();
    return MODE_COMMAND_DEFS.filter((d) => d.match.startsWith(partial)).map((d) =>
      suggestionFromDef(d, "/mode"),
    );
  }

  if (cmd === "/schema") {
    const partial = arg.toLowerCase();
    return tables
      .filter((t) => t.toLowerCase().startsWith(partial))
      .map((t) => ({
        value: `/schema ${t}`,
        label: `/schema ${t}`,
        command: `/schema ${t}`,
        description: "show table schema",
      }));
  }

  return [];
}

export function shouldShowSlashMenu(input: string, suggestions: SlashSuggestion[]): boolean {
  if (!input.startsWith("/") || suggestions.length === 0) return false;
  if (suggestions.length === 1 && input === suggestions[0]!.value) return false;
  return true;
}

export function computeGhost(input: string, profiles: string[], tables: string[]): string {
  if (!input.startsWith("/")) return "";

  const suggestions = getSlashSuggestions(input, profiles, tables);
  if (shouldShowSlashMenu(input, suggestions)) return "";

  const parts = input.split(/\s+/);
  const cmd = parts[0]!.toLowerCase();

  if (parts.length === 1) {
    const match = SLASH_COMMAND_DEFS.find((d) => d.match.startsWith(input.toLowerCase()));
    if (!match || match.match === input) return "";
    return slashInsertValue(match);
  }

  if (cmd === "/mode" && parts.length === 2) {
    const partial = parts[1]!.toLowerCase();
    const match = MODE_COMMAND_DEFS.find((d) => d.match.startsWith(partial));
    return match && match.match !== partial ? `/mode ${match.cmd}` : "";
  }

  if ((cmd === "/use" || cmd === "/connect") && parts.length === 2) {
    const partial = parts[1]!.toLowerCase();
    const match = profiles.find((p) => p.toLowerCase().startsWith(partial));
    const prefix = cmd === "/connect" ? "/connect" : "/use";
    return match && match !== parts[1] ? `${prefix} ${match}` : "";
  }

  if (cmd === "/profile" && parts.length === 2) {
    const partial = parts[1]!.toLowerCase();
    const match = PROFILE_COMMAND_DEFS.find((d) => d.match.startsWith(partial));
    if (match && match.match !== partial) return `/profile ${match.cmd}`;
    const profile = profiles.find((p) => p.toLowerCase().startsWith(partial));
    return profile && profile !== parts[1] ? `/use ${profile}` : "";
  }

  if (cmd === "/schema" && parts.length === 2) {
    const partial = parts[1]!.toLowerCase();
    const match = tables.find((t) => t.toLowerCase().startsWith(partial));
    return match && match !== parts[1] ? `/schema ${match}` : "";
  }

  return "";
}

export { SLASH_COMMANDS } from "./slashCommands.ts";
