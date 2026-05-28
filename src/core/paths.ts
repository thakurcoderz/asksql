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

export function appHome(): string {
  return resolveAppHome();
}

export function asksqlEnvPath(): string {
  return join(appHome(), ".env");
}

export function configPath(): string {
  return join(appHome(), "config.toml");
}

export function profilesDir(): string {
  return join(appHome(), "profiles");
}

export function projectsDir(): string {
  return join(appHome(), "projects");
}

export const LEGACY_DBAI_HOME = LEGACY_HOME;

export function projectDir(name: string): string {
  return join(projectsDir(), name);
}

export function projectTomlPath(name: string): string {
  return join(projectDir(name), "project.toml");
}

export function profileDir(name: string): string {
  return join(profilesDir(), name);
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
