# Contributing to AskSQL

Thanks for your interest in improving AskSQL! This is the short version; the
full guide lives in the
[Contributing wiki page](https://github.com/thakurcoderz/asksql/wiki/Contributing).

## Prerequisites

AskSQL runs on **[Bun](https://bun.sh)** (not Node). Use Bun for everything.

```bash
bun install
```

## Before you open a PR

Both of these must pass:

```bash
bun run typecheck     # tsc --noEmit
bun test              # 54+ unit tests
```

CI runs the same checks on every push and pull request.

## Workflow

1. Branch off `main`.
2. Keep commits focused with clear messages.
3. Prefer extracting non-trivial logic into pure, testable functions
   (`src/core/safety/`, `src/tui/format/`) and add tests for it.
4. **Anything that touches the database must respect the safety model** — gate
   writes through the classifier and run reads via the read-only path. See the
   [Security Model](https://github.com/thakurcoderz/asksql/wiki/Security-Model).
5. Open a PR; make sure CI is green.

## Reporting security issues

Please do **not** file public issues for vulnerabilities — see
[SECURITY.md](SECURITY.md).

## More

- [Architecture](https://github.com/thakurcoderz/asksql/wiki/Architecture) —
  how the agent loop, events, and TUI fit together.
- `CLAUDE.md` (local) — Bun API preferences used in this codebase.
