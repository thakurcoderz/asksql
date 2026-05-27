import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "smol-toml";
import { APP_HOME, CONFIG_PATH } from "./paths.ts";
import type { AppConfig, SafetyMode } from "../shared/types.ts";
import { DEFAULT_MODEL } from "../shared/types.ts";

const DEFAULTS: AppConfig = {
  default_model: DEFAULT_MODEL,
  default_mode: "safe",
};

export function ensureDbaiHome(): void {
  if (!existsSync(APP_HOME)) mkdirSync(APP_HOME, { recursive: true });
}

export function loadConfig(): AppConfig {
  ensureDbaiHome();
  if (!existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULTS);
    return { ...DEFAULTS };
  }
  const raw = parse(readFileSync(CONFIG_PATH, "utf8")) as Partial<AppConfig>;
  return {
    default_model: raw.default_model ?? DEFAULTS.default_model,
    default_mode: (raw.default_mode as SafetyMode) ?? DEFAULTS.default_mode,
    active_profile: raw.active_profile,
  };
}

export function saveConfig(config: AppConfig): void {
  ensureDbaiHome();
  writeFileSync(CONFIG_PATH, stringify(config), "utf8");
}

export function setActiveProfile(name: string): void {
  const config = loadConfig();
  config.active_profile = name;
  saveConfig(config);
}

export function getActiveProfile(): string | undefined {
  return loadConfig().active_profile;
}
