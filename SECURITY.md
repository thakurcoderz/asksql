# Security Policy

AskSQL executes model-generated SQL against real databases and stores database
credentials locally, so we take security seriously. Thank you for helping keep
it and its users safe.

## Supported versions

AskSQL is a pre-1.0 proof-of-concept. Security fixes are applied to the latest
release and `main` on a best-effort basis.

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ (latest) |
| < 0.1.0 | ❌ |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately using GitHub's **"Report a vulnerability"** button on the
repository's [Security tab](https://github.com/thakurcoderz/asksql/security)
(GitHub Private Vulnerability Reporting). This keeps the report confidential
until a fix is available.

When reporting, please include:

- A description of the issue and its impact.
- Steps to reproduce (a minimal proof-of-concept if possible).
- Affected version/commit and your environment.

This is a side project, so expect a best-effort response with no formal SLA.
We'll acknowledge the report, work with you on a fix, and credit you (if you'd
like) once it's resolved.

## Scope

In scope — for example:

- Bypasses of the safety model: read-only enforcement, the SQL classifier,
  the result-size cap, or profile-name path validation.
- Prompt-injection paths that cause unintended writes or data exfiltration.
- Local credential exposure beyond the documented file permissions.

Out of scope — operator-accepted risk:

- Running in `yolo` mode (writes/DDL without confirmation) against an
  untrusted model or prompt — this is an explicit, opt-in choice.
- Issues requiring an attacker who already has read access to the user's
  machine or `~/.asksql/` directory.
- Vulnerabilities in upstream dependencies (please report those upstream;
  we'll pick up patched versions).

## How AskSQL is hardened

For the threat model and the layered defenses (mode gating, database-enforced
read-only transactions, the SQL classifier, result caps, prompt-injection
fencing, and path-safe profiles), see the
[Security Model](https://github.com/thakurcoderz/asksql/wiki/Security-Model)
wiki page.
