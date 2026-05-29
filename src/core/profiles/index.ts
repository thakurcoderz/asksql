import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  chmodSync,
  renameSync,
} from "node:fs";
import { loadConfig, saveConfig, setActiveProfile } from "../config.ts";
import {
  connectionEnvPath,
  memoryPath,
  profileDir,
  PROFILES_DIR,
  schemaPath,
} from "../paths.ts";
import type { DbConfig } from "../../shared/types.ts";
import { generateMemory } from "../memory.ts";
import { introspectSchema } from "../schema/introspect.ts";
import { createConnection } from "../mysql.ts";

export function parseConnectionEnv(content: string): DbConfig {
  const values: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return {
    host: values.DB_HOST ?? "127.0.0.1",
    port: Number(values.DB_PORT ?? 3306),
    database: values.DB_DATABASE ?? "",
    username: values.DB_USERNAME ?? "root",
    password: values.DB_PASSWORD ?? "",
  };
}

export function formatConnectionEnv(config: DbConfig): string {
  return [
    `DB_HOST=${config.host}`,
    `DB_PORT=${config.port}`,
    `DB_DATABASE=${config.database}`,
    `DB_USERNAME=${config.username}`,
    `DB_PASSWORD=${config.password}`,
  ].join("\n") + "\n";
}

export function listProfiles(): string[] {
  if (!existsSync(PROFILES_DIR)) return [];
  return readdirSync(PROFILES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function profileExists(name: string): boolean {
  return existsSync(profileDir(name));
}

export function loadProfileConfig(name: string): DbConfig {
  const path = connectionEnvPath(name);
  if (!existsSync(path)) throw new Error(`Profile '${name}' not found`);
  return parseConnectionEnv(readFileSync(path, "utf8"));
}

export async function createProfile(config: DbConfig, overwrite = false): Promise<void> {
  const name = config.database;
  const dir = profileDir(name);
  if (existsSync(dir) && !overwrite) {
    throw new Error(`Profile '${name}' already exists`);
  }
  mkdirSync(dir, { recursive: true });
  // Profile dirs hold connection.env with DB credentials; keep them owner-only.
  chmodSync(dir, 0o700);

  const envPath = connectionEnvPath(name);
  writeFileSync(envPath, formatConnectionEnv(config), "utf8");
  chmodSync(envPath, 0o600);

  const conn = await createConnection(config);
  try {
    const schema = await introspectSchema(conn, config.database);
    writeFileSync(schemaPath(name), JSON.stringify(schema, null, 2), "utf8");
    writeFileSync(memoryPath(name), generateMemory(schema), "utf8");
  } finally {
    await conn.end();
  }

  setActiveProfile(name);
}

export function removeProfile(name: string): void {
  if (!profileExists(name)) throw new Error(`Profile '${name}' not found`);
  rmSync(profileDir(name), { recursive: true, force: true });
  const config = loadConfig();
  if (config.active_profile === name) {
    config.active_profile = undefined;
    saveConfig(config);
  }
}

export function renameProfile(oldName: string, newName: string): void {
  if (!profileExists(oldName)) throw new Error(`Profile '${oldName}' not found`);
  if (profileExists(newName)) throw new Error(`Profile '${newName}' already exists`);
  renameSync(profileDir(oldName), profileDir(newName));
  const config = loadConfig();
  if (config.active_profile === oldName) {
    config.active_profile = newName;
    saveConfig(config);
  }
}

export function resolveActiveProfile(): string | null {
  const profiles = listProfiles();
  const active = loadConfig().active_profile;
  if (active && profileExists(active)) return active;
  if (profiles.length === 1) {
    setActiveProfile(profiles[0]!);
    return profiles[0]!;
  }
  return null;
}
