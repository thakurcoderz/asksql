import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { parse, stringify } from "smol-toml";
import { loadConfig, saveConfig } from "../config.ts";
import { projectDir, projectTomlPath, projectsDir } from "../paths.ts";
import type { Project } from "../../shared/types.ts";
import { MAX_PROJECT_PROFILES } from "../../shared/types.ts";
import { profileExists } from "../profiles/index.ts";

function validateProfileNames(profiles: string[]): void {
  for (const name of profiles) {
    if (!profileExists(name)) {
      throw new Error(`Profile '${name}' not found`);
    }
  }
}

export function listProjects(): string[] {
  if (!existsSync(projectsDir())) return [];
  return readdirSync(projectsDir(), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function projectExists(name: string): boolean {
  return existsSync(projectTomlPath(name));
}

export function loadProject(name: string): Project {
  const path = projectTomlPath(name);
  if (!existsSync(path)) throw new Error(`Project '${name}' not found`);
  const raw = parse(readFileSync(path, "utf8")) as Partial<Project>;
  return {
    name: raw.name ?? name,
    description: raw.description,
    profiles: raw.profiles ?? [],
  };
}

function saveProject(project: Project): void {
  mkdirSync(projectDir(project.name), { recursive: true });
  writeFileSync(projectTomlPath(project.name), stringify(project), "utf8");
}

export function resolveProjectProfiles(name: string): string[] {
  const project = loadProject(name);
  validateProfileNames(project.profiles);
  return project.profiles;
}

export function createProject(
  name: string,
  profiles: string[],
  description?: string,
): void {
  if (projectExists(name)) throw new Error(`Project '${name}' already exists`);
  if (profiles.length === 0) throw new Error("Project must include at least one profile");
  if (profiles.length > MAX_PROJECT_PROFILES) {
    throw new Error(`Project cannot exceed ${MAX_PROJECT_PROFILES} profiles`);
  }
  validateProfileNames(profiles);
  saveProject({ name, description, profiles });
  const config = loadConfig();
  config.active_project = name;
  config.active_profile = undefined;
  saveConfig(config);
}

export function removeProject(name: string): void {
  if (!projectExists(name)) throw new Error(`Project '${name}' not found`);
  rmSync(projectDir(name), { recursive: true, force: true });
  const config = loadConfig();
  if (config.active_project === name) {
    config.active_project = undefined;
    saveConfig(config);
  }
}

export function renameProject(oldName: string, newName: string): void {
  if (!projectExists(oldName)) throw new Error(`Project '${oldName}' not found`);
  if (projectExists(newName)) throw new Error(`Project '${newName}' already exists`);
  renameSync(projectDir(oldName), projectDir(newName));
  const project = loadProject(newName);
  project.name = newName;
  saveProject(project);
  const config = loadConfig();
  if (config.active_project === oldName) {
    config.active_project = newName;
    saveConfig(config);
  }
}

export function addProfileToProject(projectName: string, profileName: string): void {
  if (!profileExists(profileName)) throw new Error(`Profile '${profileName}' not found`);
  const project = loadProject(projectName);
  if (project.profiles.includes(profileName)) return;
  if (project.profiles.length >= MAX_PROJECT_PROFILES) {
    throw new Error(`Project cannot exceed ${MAX_PROJECT_PROFILES} profiles`);
  }
  project.profiles.push(profileName);
  saveProject(project);
}

export function removeProfileFromProject(projectName: string, profileName: string): void {
  const project = loadProject(projectName);
  project.profiles = project.profiles.filter((p) => p !== profileName);
  if (project.profiles.length === 0) {
    throw new Error("Project must keep at least one profile");
  }
  saveProject(project);
}
