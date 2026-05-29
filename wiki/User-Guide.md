# User Guide

Everything you can do once AskSQL is installed and a database is connected. New here? Start with **[[Getting Started]]**.

## CLI commands

Run `asksql` with no arguments to open the TUI. Subcommands:

| Command | Description |
|---------|-------------|
| `asksql` / `asksql tui` | Launch the full-screen TUI (default). |
| `asksql tui -p <name>` / `asksql -p <name>` | Launch the TUI with a profile pre-selected. |
| `asksql new` | Interactive wizard to add a MySQL connection. |
| `asksql connect <name>` | Switch the active profile. |
| `asksql list` | List saved profiles (active one marked `*`). |
| `asksql remove <name>` | Delete a profile (asks for confirmation). |
| `asksql rename <old> <new>` | Rename a profile. |
| `asksql ask "<question>"` | One-shot, non-interactive question (for scripts). |
| `asksql alias [name]` | Append `alias ai=asksql` to your shell rc files. |

Every command loads the `.env` cascade and requires `OPENROUTER_API_KEY`.

## The TUI dashboard

The terminal UI is a two-column dashboard so database context stays visible while you chat.

![AskSQL dashboard — schema sidebar, query cards with timing and mode, and a session-stats footer](https://raw.githubusercontent.com/thakurcoderz/asksql/main/demo.jpg)

### Schema sidebar (left)

Shows your connection at a glance and the cached schema:

- Connection identity (`user@host`), database name.
- `N tables · total rows` and **when the schema was last refreshed**.
- A scrollable table list: each table's name, approximate **row count**, a preview of its columns, and a foreign-key count.

The sidebar **collapses automatically** on terminals narrower than 84 columns so the conversation keeps full width. Run `/refresh` (or `Ctrl+R`) to re-introspect and live-update it.

### Conversation (right)

- **Your messages** are prefixed with `›`.
- **Query cards** show the generated SQL with syntax highlighting, a result table, and a header reading `read|write · N rows · <time> · <mode>`.
- **Schema inspections** and **memory updates** appear as compact dim lines.
- **Answers** stream in as Markdown; row data is rendered in the table, not repeated in prose.

### Status bar (footer)

`asksql · <profile> · <mode> · <model>` on the left; live **session stats** on the right: queries run, errors, cumulative elapsed time, and token usage. A `working…` indicator appears while the agent is busy.

## Slash commands

Type `/` in the prompt to open an autocomplete menu above the input. Each row shows the command and a short description; only the **command** is inserted when you accept.

| Command | Action |
|---------|--------|
| `/new`, `/chat` | Start a fresh conversation (agent forgets prior turns). |
| `/clear` | Clear chat history (alias for `/new`). |
| `/profile new` (or `/profile add`) | Open the add-connection wizard. |
| `/profile list`, `/profiles` | List saved connections. |
| `/profile <name>` | Switch to a saved connection. |
| `/use <name>`, `/connect <name>` | Switch database and start a new chat. |
| `/mode safe\|confirm\|yolo` | Change the safety mode (persisted to config). |
| `/model <id>` | Change the OpenRouter model (persisted to config). |
| `/schema [table]` | Show all tables, or one table's columns. |
| `/refresh` | Re-introspect the database and update the sidebar. |
| `/memory` | Print the path to this profile's `memory.md`. |
| `/help` | Toggle the help overlay. |
| `/quit`, `/exit` | Exit AskSQL. |

> **Tip:** `/new` starts a fresh conversation on the **same** database. `/use other_db` switches database *and* starts fresh. Chat is blocked until a connection is active.

Arg-taking commands (`/use`, `/profile`, `/mode`, `/model`, `/schema`, `/connect`) insert with a trailing space so you can keep completing.

## Keybindings

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move selection in the slash menu |
| `Tab` / `→` | Accept the highlighted suggestion / ghost text |
| `Ctrl+P` | Open the command palette |
| `Ctrl+L` | New chat (same as `/new`) |
| `Ctrl+R` | Refresh schema |
| `Ctrl+C` | Quit |
| `Esc` | Close help, palette, wizard, or confirmation |
| `y` / `n` | Approve / decline a write confirmation (in `confirm` mode) |

## Safety modes

| Mode | Reads | Writes / DDL |
|------|-------|--------------|
| `safe` | Allowed | **Denied** |
| `confirm` | Allowed | Requires an in-app `y/N` confirmation |
| `yolo` | Allowed | Allowed without prompting |

The default comes from `ASKSQL_MODE` (or legacy `DBAI_MODE`), otherwise `~/.asksql/config.toml`, otherwise `safe`. Changing the mode with `/mode` persists it.

These modes are only the first layer — reads are *also* enforced read-only at the database level, and stacked/ambiguous statements are blocked regardless of mode. See **[[Security Model]]** for the full picture.

## Configuration & profiles on disk

**Global config** — `~/.asksql/config.toml` (legacy `~/.dbai/config.toml`): `default_model`, `default_mode`, `active_profile`.

**Per-database profile** — `~/.asksql/profiles/<database>/`:

| File | Purpose |
|------|---------|
| `connection.env` | MySQL host, port, user, password (perms `0600`). |
| `schema.json` | Cached introspection; refreshed on demand. |
| `memory.md` | Agent notes appended across sessions; edit freely. |
| `history.jsonl` | Optional per-question history log. |

Set `ASKSQL_HOME` to relocate the whole data directory.
