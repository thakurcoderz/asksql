# AskSQL Wiki

**AskSQL** is a natural-language MySQL assistant powered by [OpenRouter](https://openrouter.ai) and [OpenTUI](https://github.com/sst/opentui). Ask questions in plain English; AskSQL inspects your schema, generates **gated** SQL, runs it safely, and renders results in a terminal dashboard or a one-shot CLI.

![AskSQL TUI — natural-language to SQL with a schema sidebar, query cards, and session stats](https://raw.githubusercontent.com/thakurcoderz/asksql/main/demo.jpg)

## Why AskSQL

- **Plain-English querying** — the agent reads your schema and writes the SQL for you.
- **Safety first** — a layered model (mode gating → SQL classifier → database-enforced read-only transactions → bounded results) keeps the agent from doing anything you didn't intend. See **[[Security Model]]**.
- **Context always visible** — a two-column dashboard shows a live schema sidebar and session stats. See the **[[User Guide]]**.
- **Local & private** — profiles and credentials live in `~/.asksql/`; only your questions and the schema summary go to the model.

## Documentation

| Page | What's inside |
|------|---------------|
| **[[Getting Started]]** | Install, configure your API key, connect a database, ask your first question. |
| **[[User Guide]]** | CLI commands, the TUI dashboard, slash commands, keybindings, and safety modes. |
| **[[Security Model]]** | Deep dive on the layered defenses and the threat model behind them. |
| **[[Architecture]]** | Agent tool loop, event flow, module map, and on-disk layout. |
| **[[Contributing]]** | Dev workflow, testing, and how to extend the agent and TUI. |

## At a glance

- **Runtime:** [Bun](https://bun.sh) (TypeScript, no Node).
- **Model provider:** OpenRouter (default model `openai/gpt-5.4-nano`).
- **Database:** MySQL, via `mysql2`.
- **UI:** OpenTUI + React for the TUI; [citty](https://github.com/unjs/citty) for the CLI.

> AskSQL is an active proof-of-concept. The source of truth is the code in `src/`; this wiki summarizes behavior as of the current `main`.
