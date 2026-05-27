import type { CliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";

export interface KeymapHandlers {
  onPalette: () => void;
  onClear: () => void;
  onRefresh: () => void;
  onQuit: () => void;
  onAcceptGhost: () => void;
}

export function setupKeymap(renderer: CliRenderer, handlers: KeymapHandlers) {
  const keymap = createDefaultOpenTuiKeymap(renderer);

  keymap.registerLayer({
    bindings: [
      { key: "ctrl+p", cmd: "palette.open" },
      { key: "ctrl+l", cmd: "chat.clear" },
      { key: "ctrl+r", cmd: "schema.refresh" },
      { key: "ctrl+c", cmd: "app.quit" },
      { key: "tab", cmd: "ghost.accept" },
      { key: "right", cmd: "ghost.accept" },
    ],
    commands: [
      { name: "palette.open", title: "Open command palette", run: handlers.onPalette },
      { name: "chat.clear", title: "Clear chat", run: handlers.onClear },
      { name: "schema.refresh", title: "Refresh schema", run: handlers.onRefresh },
      { name: "app.quit", title: "Quit", run: handlers.onQuit },
      { name: "ghost.accept", title: "Accept suggestion", run: handlers.onAcceptGhost },
    ],
  });

  return keymap;
}
