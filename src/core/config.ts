import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "smol-toml";
import { appHome, configPath } from "./paths.ts";
import type { ActiveScope, AppConfig, SafetyMode } from "../shared/types.ts";
import { DEFAULT_MODEL } from "../shared/types.ts";
import { profileExists, resolveActiveProfile } from "./profiles/index.ts";
import { projectExists, resolveProjectProfiles } from "./projects/index.ts";

const DEFAULTS: AppConfig = {
  default_model: DEFAULT_MODEL,
  default_mode: "safe",
};

export function ensureDbaiHome(): void {
  if (!existsSync(appHome())) mkdirSync(appHome(), { recursive: true });
}

export function loadConfig(): AppConfig {
  ensureDbaiHome();
  if (!existsSync(configPath())) {
    saveConfig(DEFAULTS);
    return { ...DEFAULTS };
  }
  const raw = parse(readFileSync(configPath(), "utf8")) as Partial<AppConfig>;
  return {
    default_model: raw.default_model ?? DEFAULTS.default_model,
    default_mode: (raw.default_mode as SafetyMode) ?? DEFAULTS.default_mode,
    active_profile: raw.active_profile,
    active_project: raw.active_project,
  };
}

export function saveConfig(config: AppConfig): void {
  ensureDbaiHome();
  writeFileSync(configPath(), stringify(config), "utf8");
}

export function setActiveProfile(name: string): void {
  const config = loadConfig();
  config.active_profile = name;
  config.active_project = undefined;
  saveConfig(config);
}

export function setActiveProject(name: string): void {
  const config = loadConfig();
  config.active_project = name;
  config.active_profile = undefined;
  saveConfig(config);
}

export function clearActiveScope(): void {
  const config = loadConfig();
  config.active_profile = undefined;
  config.active_project = undefined;
  saveConfig(config);
}

export function getActiveProfile(): string | undefined {
  return loadConfig().active_profile;
}

export function resolveActiveScope(): ActiveScope {
  const config = loadConfig();

  if (config.active_project && projectExists(config.active_project)) {
    try {
      const profiles = resolveProjectProfiles(config.active_project);
      if (profiles.length > 0) {
        return { kind: "project", name: config.active_project, profiles };
      }
    } catch {
      config.active_project = undefined;
      saveConfig(config);
    }
  }

  const profile = resolveActiveProfile();
  if (profile) return { kind: "profile", name: profile };

  return null;
}

export function scopeToAgentScope(scope: NonNullable<ActiveScope>): import("../shared/types.ts").AgentScope {
  if (scope.kind === "profile") {
    return { kind: "profile", profileName: scope.name };
  }
  return { kind: "project", projectName: scope.name, profileNames: scope.profiles };
}

/** Whether chat can run (profile or project with profiles). */
export function canChat(scope: ActiveScope): boolean {
  if (!scope) return false;
  if (scope.kind === "profile") return profileExists(scope.name);
  return scope.profiles.length > 0 && scope.profiles.every((p) => profileExists(p));
}
