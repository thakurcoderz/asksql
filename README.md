# AskSQL

Natural-language MySQL assistant powered by OpenRouter and OpenTUI.

Ask questions in plain English; AskSQL inspects schema, runs gated SQL, and shows results in a terminal UI or CLI.

## Install

```bash
bun install
bun link
```

Create a `.env` in the project root (or anywhere up to the git root):

```bash
OPENROUTER_API_KEY=sk-or-...
# ASKSQL_MODEL=openai/gpt-5.4-nano   # optional
# ASKSQL_MODE=safe                   # optional: safe | confirm | yolo
```

AskSQL loads `.env` in this order (first wins; already-set env vars are not overridden):

1. Current directory → git root
2. This package’s install directory
3. `~/.asksql/.env` (fallback; legacy `~/.dbai/.env` if you upgraded from dbai)

Legacy env names `DBAI_MODEL` and `DBAI_MODE` still work.

## Usage

```bash
asksql new              # create a profile (MySQL connection + schema introspection)
asksql tui              # launch the TUI
asksql ask "how many users?"
asksql list
asksql connect <name>
asksql remove <name>
asksql rename <old> <new>
asksql alias            # add alias ai=asksql to shell rc
```

### TUI shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+P` | Command palette |
| `Ctrl+L` | Clear chat |
| `Ctrl+R` | Refresh schema |
| `Ctrl+C` | Quit |
| `?` | Help |
| `Tab` / `→` | Accept autocomplete ghost text |

Slash commands in the prompt: `/help`, `/clear`, `/mode safe|confirm|yolo`, `/connect <profile>`, etc.

## Safety modes

| Mode | Reads | Writes / DDL |
|------|-------|----------------|
| `safe` | Allowed | Denied |
| `confirm` | Allowed | Requires confirmation in TUI |
| `yolo` | Allowed | Allowed without prompt |

Default mode comes from `ASKSQL_MODE` (or legacy `DBAI_MODE`) or `~/.asksql/config.toml`.

## Config & profiles

**Global config** — `~/.asksql/config.toml` (or legacy `~/.dbai/config.toml`)

- `default_model`, `default_mode`, `active_profile`

**Per-database profile** — `~/.asksql/profiles/{database}/`

| File | Purpose |
|------|---------|
| `connection.env` | MySQL host, port, user, password |
| `schema.json` | Cached introspection (refreshed on demand) |
| `memory.md` | Agent notes appended across sessions |
| `history.jsonl` | Optional session history |

Existing **dbai** users keep profiles under `~/.dbai/` automatically until you migrate:

```bash
mv ~/.dbai ~/.asksql
```

## Project structure

```
src/
  cli/           CLI commands (citty)
  core/
    agent/       OpenRouter tool loop
    safety/      SQL classifier & mode gating
    schema/      MySQL introspection
    profiles/    Profile CRUD
    env.ts       Env cascade & OpenRouter key
    mysql.ts     Query execution
  shared/        Shared TypeScript types
  tui/           OpenTUI React terminal UI
tests/           Unit tests (bun:test)
```

## Development

```bash
bun test              # run all tests
bun run typecheck     # tsc --noEmit
bun run tui           # TUI without linking
```

After changing the CLI entrypoint, run `bun link` so `~/.bun/bin/asksql` picks up changes.

### Architecture (short)

1. User message → `runAgentTurn()` streams `AgentEvent`s.
2. Agent calls tools: schema inspect, SQL read/write (gated), memory update.
3. TUI maps events to **transcript blocks** (user, execution cards, tables, streaming answer).
4. Pure format helpers (`tableLayout`, `transcriptMerge`, `answerSanitize`) keep rendering testable.

## Cursor AI setup

| Path | Purpose |
|------|---------|
| [`.cursor/rules/asksql-project.mdc`](.cursor/rules/asksql-project.mdc) | Always-on project standards |
| [`.cursor/rules/asksql-tui-opentui.mdc`](.cursor/rules/asksql-tui-opentui.mdc) | OpenTUI TUI conventions |
| [`.cursor/rules/asksql-agent-core.mdc`](.cursor/rules/asksql-agent-core.mdc) | Agent, safety, profiles |
| [`.cursor/skills/asksql-development/SKILL.md`](.cursor/skills/asksql-development/SKILL.md) | Development guide |
| [`.cursor/skills/asksql-tui/SKILL.md`](.cursor/skills/asksql-tui/SKILL.md) | TUI layout debugging |

See [`CLAUDE.md`](CLAUDE.md) for Bun-specific API preferences.

## License

Private POC — see repository owner for terms.
