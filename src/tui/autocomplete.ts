const SLASH_COMMANDS = [
  "/help",
  "/connect",
  "/profiles",
  "/mode",
  "/model",
  "/refresh",
  "/schema",
  "/memory",
  "/clear",
  "/quit",
  "/exit",
];

export function computeGhost(input: string, profiles: string[], tables: string[]): string {
  if (!input.startsWith("/")) return "";

  const parts = input.split(/\s+/);
  const cmd = parts[0]!.toLowerCase();

  if (parts.length === 1) {
    const match = SLASH_COMMANDS.find((c) => c.startsWith(input.toLowerCase()));
    return match && match !== input ? match : "";
  }

  if (cmd === "/mode" && parts.length === 2) {
    const partial = parts[1]!.toLowerCase();
    const modes = ["safe", "confirm", "yolo"];
    const match = modes.find((m) => m.startsWith(partial));
    return match && match !== partial ? `/mode ${match}` : "";
  }

  if (cmd === "/connect" && parts.length === 2) {
    const partial = parts[1]!.toLowerCase();
    const match = profiles.find((p) => p.toLowerCase().startsWith(partial));
    return match && match !== parts[1] ? `/connect ${match}` : "";
  }

  if (cmd === "/schema" && parts.length === 2) {
    const partial = parts[1]!.toLowerCase();
    const match = tables.find((t) => t.toLowerCase().startsWith(partial));
    return match && match !== parts[1] ? `/schema ${match}` : "";
  }

  return "";
}

export { SLASH_COMMANDS };
