import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function setupHome(): string {
  const home = mkdtempSync(join(tmpdir(), "asksql-test-"));
  process.env.ASKSQL_HOME = home;
  mkdirSync(join(home, "profiles", "demo"), { recursive: true });
  mkdirSync(join(home, "profiles", "analytics"), { recursive: true });
  writeFileSync(
    join(home, "profiles", "demo", "connection.env"),
    "DB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=demo\nDB_USERNAME=root\nDB_PASSWORD=\n",
  );
  writeFileSync(
    join(home, "profiles", "analytics", "connection.env"),
    "DB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=analytics\nDB_USERNAME=root\nDB_PASSWORD=\n",
  );
  const schema = {
    database: "demo",
    introspected_at: "2026-01-01T00:00:00Z",
    tables: [
      {
        name: "users",
        engine: "InnoDB",
        row_count: 10,
        columns: [{ name: "id", type: "int", nullable: false, key: "PRI", default: null, comment: "" }],
        foreign_keys: [],
        indexes: [],
        incoming_fks: [],
      },
    ],
  };
  writeFileSync(join(home, "profiles", "demo", "schema.json"), JSON.stringify(schema));
  writeFileSync(join(home, "profiles", "demo", "memory.md"), "# Memory\n");
  writeFileSync(
    join(home, "profiles", "analytics", "schema.json"),
    JSON.stringify({ ...schema, database: "analytics" }),
  );
  writeFileSync(join(home, "profiles", "analytics", "memory.md"), "# Memory\n");
  return home;
}

describe("projects", () => {
  let home: string;

  beforeEach(async () => {
    home = setupHome();
    const { saveConfig } = await import("../src/core/config.ts");
    saveConfig({ default_model: "test/model", default_mode: "safe" });
  });

  afterEach(() => {
    delete process.env.ASKSQL_HOME;
    rmSync(home, { recursive: true, force: true });
  });

  test("create and list projects", async () => {
    const { createProject, listProjects, loadProject } = await import("../src/core/projects/index.ts");
    createProject("trualta", ["demo", "analytics"]);
    expect(listProjects()).toEqual(["trualta"]);
    expect(loadProject("trualta").profiles).toEqual(["demo", "analytics"]);
  });

  test("setActiveProfile clears active_project", async () => {
    const { createProject } = await import("../src/core/projects/index.ts");
    const { setActiveProfile, loadConfig } = await import("../src/core/config.ts");
    createProject("trualta", ["demo"]);
    setActiveProfile("demo");
    const config = loadConfig();
    expect(config.active_profile).toBe("demo");
    expect(config.active_project).toBeUndefined();
  });

  test("setActiveProject clears active_profile", async () => {
    const { createProject } = await import("../src/core/projects/index.ts");
    const { setActiveProject, setActiveProfile, loadConfig } = await import("../src/core/config.ts");
    setActiveProfile("demo");
    createProject("trualta", ["demo", "analytics"]);
    setActiveProject("trualta");
    const config = loadConfig();
    expect(config.active_project).toBe("trualta");
    expect(config.active_profile).toBeUndefined();
  });

  test("rejects exceeding MAX_PROJECT_PROFILES", async () => {
    const { createProject, addProfileToProject } = await import("../src/core/projects/index.ts");
    const profiles = ["demo", "analytics"];
    for (let i = 2; i < 9; i++) {
      const name = `p${i}`;
      mkdirSync(join(home, "profiles", name), { recursive: true });
      writeFileSync(
        join(home, "profiles", name, "connection.env"),
        `DB_DATABASE=${name}\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_USERNAME=root\nDB_PASSWORD=\n`,
      );
      writeFileSync(
        join(home, "profiles", name, "schema.json"),
        JSON.stringify({ database: name, introspected_at: "", tables: [] }),
      );
      writeFileSync(join(home, "profiles", name, "memory.md"), "# m\n");
      profiles.push(name);
    }
    createProject("big", profiles.slice(0, 8));
    expect(() => addProfileToProject("big", profiles[8]!)).toThrow(/cannot exceed/);
  });
});

describe("agent scope", () => {
  let home: string;

  beforeEach(() => {
    home = setupHome();
  });

  afterEach(() => {
    delete process.env.ASKSQL_HOME;
    rmSync(home, { recursive: true, force: true });
  });

  test("buildSystemPrompt includes all profiles in project mode", async () => {
    const { buildSystemPrompt } = await import("../src/core/agent/index.ts");
    const prompt = buildSystemPrompt(
      { kind: "project", projectName: "trualta", profileNames: ["demo", "analytics"] },
      "safe",
    );
    expect(prompt).toContain("PROJECT mode");
    expect(prompt).toContain("### Profile: demo");
    expect(prompt).toContain("### Profile: analytics");
    expect(prompt).toContain('"profile" parameter');
  });

  test("buildSystemPrompt single profile unchanged shape", async () => {
    const { buildSystemPrompt } = await import("../src/core/agent/index.ts");
    const prompt = buildSystemPrompt({ kind: "profile", profileName: "demo" }, "safe");
    expect(prompt).toContain('database "demo"');
    expect(prompt).not.toContain("PROJECT mode");
  });

  test("resolveToolProfile requires profile in project mode", async () => {
    const { resolveToolProfile } = await import("../src/core/agent/index.ts");
    const scope = { kind: "project" as const, projectName: "t", profileNames: ["demo"] };
    const missing = resolveToolProfile(scope, {});
    expect(missing).toEqual({ error: expect.stringContaining("profile parameter required") });
    expect(resolveToolProfile(scope, { profile: "demo" })).toBe("demo");
  });

  test("resolveToolProfile ignores profile arg in single-profile mode", async () => {
    const { resolveToolProfile } = await import("../src/core/agent/index.ts");
    const scope = { kind: "profile" as const, profileName: "demo" };
    expect(resolveToolProfile(scope, { profile: "wrong" })).toBe("demo");
  });
});
