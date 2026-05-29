# Changelog

All notable changes to AskSQL are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-29

First release.

### Added

- Natural-language MySQL assistant: an OpenRouter agent loop that inspects
  schema, runs read/write SQL, and keeps per-database memory across sessions.
- Two-column dashboard TUI (OpenTUI + React): live schema sidebar (tables, row
  counts, columns, foreign keys), query cards showing execution time and the
  safety mode, and a footer with session stats (queries, errors, elapsed time,
  token usage).
- One-shot CLI: `asksql ask "<question>"` for non-interactive use, plus
  `new` / `connect` / `list` / `remove` / `rename` profile commands.
- Per-database profiles under `~/.asksql/` (connection, cached schema,
  editable `memory.md`, optional history).
- Project wiki: Getting Started, User Guide, Security Model, Architecture, and
  Contributing.

### Security

- Layered safety model with `safe` / `confirm` / `yolo` modes and a SQL
  classifier; stacked statements rejected and CTE-hidden writes correctly
  classified as writes.
- Reads run inside a `READ ONLY` transaction so the database rejects any write
  that slips past the classifier.
- Server-side row cap (`SQL_SELECT_LIMIT`) to bound client memory.
- Prompt-injection fencing for schema metadata and `memory.md`.
- Path-safe profile names and owner-only (`0600` / `0700`) credential files.

[Unreleased]: https://github.com/thakurcoderz/asksql/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/thakurcoderz/asksql/releases/tag/v0.1.0
