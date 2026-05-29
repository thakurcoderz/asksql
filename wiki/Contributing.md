# Contributing

Dev workflow and how to extend AskSQL. For how the pieces fit together, see **[[Architecture]]**.

## Setup

```bash
bun install
```

AskSQL runs on **Bun** — use Bun for everything (`bun <file>`, `bun test`, `bun install`, `bunx`). Bun auto-loads `.env`, so there's no `dotenv`. See `CLAUDE.md` for the full set of Bun API preferences (e.g. `bun:sqlite`, `Bun.serve`, `Bun.$`).

## Common commands

```bash
bun test              # run all unit tests
bun run typecheck     # tsc --noEmit
bun run tui           # launch the TUI without linking
bun link              # install the asksql binary to ~/.bun/bin
```

After changing the CLI entrypoint, re-run `bun link` so `~/.bun/bin/asksql` picks up the change.

## Testing philosophy

Pure logic is separated from I/O so it can be tested without a database or a TTY:

- **Safety** — `tests/safety.test.ts`, `tests/readOnlyQuery.test.ts`, `tests/promptFence.test.ts`, `tests/profileName.test.ts`.
- **Rendering helpers** — `tests/tableLayout.test.ts`, `tests/transcriptMerge.test.ts`, `tests/answerSanitize.test.ts`, `tests/numbers.test.ts`.
- **Core** — `tests/env.test.ts`, `tests/memory.test.ts`, `tests/layout.test.ts`.

When adding behavior, prefer extracting the decision into a pure function in `core/safety/` or `tui/format/` and unit-testing it. Database calls are mocked by passing a fake `Connection` (see `tests/readOnlyQuery.test.ts`).

Run `bun test` and `bun run typecheck` before opening a PR. Both must pass.

## How to… 

### Add a slash command

1. Add a `SlashCommandDef` to `SLASH_COMMAND_DEFS` in `src/tui/slashCommands.ts` (set `needsArg: true` if it takes an argument). Add it to `SLASH_HELP` too.
2. Handle it in the `switch (cmd)` block of `handleSlash` in `src/tui/App.tsx`.
3. If it changes persistent state, write through `loadConfig`/`saveConfig`.

### Add an agent tool

1. Append a `ChatCompletionTool` definition to `TOOLS` in `src/core/agent/index.ts`.
2. Add a `case` in `executeTool` that runs it and emits the right `AgentEvent`(s).
3. If it emits a new event shape, extend the `AgentEvent` union in `src/shared/types.ts` and handle it in the TUI's `handleAgentEvent` (and the CLI's `onEvent` if relevant).
4. **Anything that touches the database must respect the safety model** — gate writes via the classifier and run reads through `queryRowsReadOnly`. See **[[Security Model]]**.

### Add a TUI panel or block

1. New transcript block kinds go in the `TranscriptBlock` union (`src/shared/types.ts`) and the reducer (`src/tui/state/store.ts`).
2. Render them in `src/tui/components/` and wire them in `Transcript.tsx`.
3. Keep width/measurement math in `src/tui/format/` so it can be tested headlessly. Note that OpenTUI's `scrollbox` lays its scrollbar out as a flex sibling — budget a column for it (see `SchemaSidebar.tsx`).

## Code conventions

- TypeScript, ES modules, `.ts`/`.tsx` with explicit extensions in imports.
- Match the surrounding style; keep comments sparse and purposeful.
- Prefer pure, testable functions for any non-trivial logic.
- Don't log or persist credentials. Validate anything that becomes a filesystem path through `assertValidProfileName` / `profileDir`.

## Branch & PR flow

- Branch off `main`; open a PR (the project uses GitHub PRs — see the merged security-hardening PR for the style).
- Keep commits focused with descriptive messages.
- Ensure `bun test` and `bun run typecheck` are green in the PR.

## Project layout

See the module map in **[[Architecture]]** for where everything lives.
