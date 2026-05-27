import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { ASKSQL_ENV, getInstallRoot } from "./paths.ts";
import type { SafetyMode } from "../shared/types.ts";

const ENV_ALIASES: Record<string, string> = {
  DB_NAME: "DB_DATABASE",
};

function findGitRoot(start: string): string | null {
  let dir = start;
  while (true) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = join(dir, "..");
    if (parent === dir) return null;
    dir = parent;
  }
}

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  let content = trimmed;
  if (content.startsWith("export ")) content = content.slice(7).trim();

  const eq = content.indexOf("=");
  if (eq === -1) return null;

  let key = content.slice(0, eq).trim();
  let value = content.slice(eq + 1).trim();

  const hashIdx = value.indexOf(" #");
  if (hashIdx !== -1 && !value.startsWith('"') && !value.startsWith("'")) {
    value = value.slice(0, hashIdx).trim();
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  key = ENV_ALIASES[key] ?? key;
  return { key, value };
}

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (process.env[parsed.key] === undefined) {
      process.env[parsed.key] = parsed.value;
    }
  }
}

export function loadEnvCascade(cwd = process.cwd()): void {
  const gitRoot = findGitRoot(cwd);
  if (gitRoot) {
    let dir = cwd;
    while (true) {
      loadEnvFile(join(dir, ".env"));
      if (dir === gitRoot) break;
      const parent = join(dir, "..");
      if (parent === dir) break;
      dir = parent;
    }
  } else {
    loadEnvFile(join(cwd, ".env"));
  }

  loadEnvFile(join(getInstallRoot(), ".env"));
  loadEnvFile(ASKSQL_ENV);
}

export function requireOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error("OPENROUTER_API_KEY is not set.");
    console.error("Add it to .env in your project, install root, or ~/.asksql/.env");
    process.exit(1);
  }
  return key;
}

export function getModel(): string {
  return process.env.ASKSQL_MODEL ?? process.env.DBAI_MODEL ?? DEFAULT_MODEL_FROM_CONFIG();
}

export function getDefaultMode(): SafetyMode {
  const mode = process.env.ASKSQL_MODE ?? process.env.DBAI_MODE;
  if (mode === "safe" || mode === "confirm" || mode === "yolo") return mode;
  return "safe";
}

function DEFAULT_MODEL_FROM_CONFIG(): string {
  return "openai/gpt-5.4-nano";
}

export function getGitRoot(cwd = process.cwd()): string | null {
  try {
    return execSync("git rev-parse --show-toplevel", { cwd, encoding: "utf8" }).trim();
  } catch {
    return findGitRoot(cwd);
  }
}
