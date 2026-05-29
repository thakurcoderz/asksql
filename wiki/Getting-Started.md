# Getting Started

This page takes you from a fresh clone to your first answered question.

## Prerequisites

- **[Bun](https://bun.sh)** — AskSQL runs on Bun, not Node. Install with `curl -fsSL https://bun.sh/install | bash`.
- **A reachable MySQL database** — host, port, database name, username, password.
- **An [OpenRouter](https://openrouter.ai) API key** — used to call the language model.

## 1. Install

```bash
bun install
bun link
```

`bun link` puts the `asksql` binary at `~/.bun/bin/asksql`. Make sure `~/.bun/bin` is on your `PATH`.

> Prefer not to link? Use `bun run tui` to launch the TUI directly from the repo.

## 2. Set your API key

Create a `.env` in the project root (or anywhere up to the git root):

```bash
OPENROUTER_API_KEY=sk-or-...
# ASKSQL_MODEL=openai/gpt-5.4-nano   # optional, overrides the default model
# ASKSQL_MODE=safe                   # optional: safe | confirm | yolo
```

AskSQL loads `.env` files in this order — **first value wins**, and an already-set environment variable is never overridden:

1. Current directory walking up to the git root
2. The package's install directory
3. `~/.asksql/.env` (fallback; legacy `~/.dbai/.env` if you came from `dbai`)

Legacy env names `DBAI_MODEL` and `DBAI_MODE` still work. The key `DB_NAME` is accepted as an alias for `DB_DATABASE`.

If `OPENROUTER_API_KEY` is missing, AskSQL exits with a message telling you where it looked.

## 3. Connect a database

Launch the app and create a profile from inside it:

```bash
asksql
```

On first run with no profiles, AskSQL opens the **connection wizard** automatically. You can also trigger it any time with the slash command:

```
/profile new
```

The wizard prompts for host, port, database, username, and password, then **tests the connection** before saving. On success it:

- writes `~/.asksql/profiles/<database>/connection.env` (permissions `0600`),
- introspects and caches the schema to `schema.json`,
- generates a starter `memory.md`,
- sets the new profile as active.

> **Profile names** are derived from the database name and validated — only letters, numbers, `.`, `_`, and `-` are allowed (no path separators or `..`). See **[[Security Model]]**.

### From the shell instead

```bash
asksql new                 # interactive wizard (CLI)
asksql connect <name>      # switch the active profile
asksql list                # list saved profiles
```

## 4. Ask your first question

With a profile active, just type in plain English:

```
how many users signed up this week?
```

AskSQL will (typically) inspect the relevant tables, run a single read query, render the result as a table, and add a one-or-two-sentence interpretation. Query cards show the SQL, the row count, the **execution time**, and the **safety mode** that ran it.

One-shot from the shell (handy for scripts):

```bash
asksql ask "how many users signed up this week?"
```

## 5. Pick a safety mode

AskSQL starts in **`safe`** mode (reads only). Switch any time:

```
/mode confirm     # writes/DDL require an in-app y/N confirmation
/mode yolo        # writes/DDL run without prompting
```

See **[[User Guide]]** → *Safety modes* for the full table, and **[[Security Model]]** for what each mode actually enforces.

## Upgrading from `dbai`

Existing `dbai` users keep working against `~/.dbai/` automatically. To migrate:

```bash
mv ~/.dbai ~/.asksql
```

## Next steps

- **[[User Guide]]** — every command, the dashboard tour, and keybindings.
- **[[Architecture]]** — how a question becomes SQL and results.
