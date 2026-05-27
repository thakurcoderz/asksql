import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LEGACY_HOME = join(homedir(), ".dbai");
const DEFAULT_HOME = join(homedir(), ".asksql");

/** Resolved data dir: ASKSQL_HOME env, else ~/.asksql, else legacy ~/.dbai if present. */
export function resolveAppHome(): string {
  if (process.env.ASKSQL_HOME) return process.env.ASKSQL_HOME;
  if (existsSync(DEFAULT_HOME)) return DEFAULT_HOME;
  if (existsSync(LEGACY_HOME)) return LEGACY_HOME;
  return DEFAULT_HOME;
}

export const APP_HOME = resolveAppHome();
export const ASKSQL_HOME = APP_HOME;
/** @deprecated Use APP_HOME / ASKSQL_HOME */
export const DBAI_HOME = APP_HOME;

export const ASKSQL_ENV = join(APP_HOME, ".env");
/** @deprecated Use ASKSQL_ENV */
export const DBAI_ENV = ASKSQL_ENV;

export const CONFIG_PATH = join(APP_HOME, "config.toml");
export const PROFILES_DIR = join(APP_HOME, "profiles");
export const LEGACY_DBAI_HOME = LEGACY_HOME;

export function profileDir(name: string): string {
  return join(PROFILES_DIR, name);
}

export function connectionEnvPath(name: string): string {
  return join(profileDir(name), "connection.env");
}

export function schemaPath(name: string): string {
  return join(profileDir(name), "schema.json");
}

export function memoryPath(name: string): string {
  return join(profileDir(name), "memory.md");
}

export function historyPath(name: string): string {
  return join(profileDir(name), "history.jsonl");
}

const installRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export function getInstallRoot(): string {
  return installRoot;
}
