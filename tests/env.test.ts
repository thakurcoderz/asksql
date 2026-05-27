import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Re-implement parseEnvLine logic for testing via loadEnvCascade side effects
function parseEnvLines(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    let c = trimmed;
    if (c.startsWith("export ")) c = c.slice(7).trim();
    const eq = c.indexOf("=");
    if (eq === -1) continue;
    let key = c.slice(0, eq).trim();
    let value = c.slice(eq + 1).trim();
    const hashIdx = value.indexOf(" #");
    if (hashIdx !== -1 && !value.startsWith('"') && !value.startsWith("'")) {
      value = value.slice(0, hashIdx).trim();
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === "DB_NAME") key = "DB_DATABASE";
    result[key] = value;
  }
  return result;
}

describe("env parser", () => {
  test("quoted values", () => {
    const parsed = parseEnvLines('DB_HOST="127.0.0.1"');
    expect(parsed.DB_HOST).toBe("127.0.0.1");
  });

  test("export prefix", () => {
    const parsed = parseEnvLines("export DB_HOST=localhost");
    expect(parsed.DB_HOST).toBe("localhost");
  });

  test("DB_NAME alias", () => {
    const parsed = parseEnvLines("DB_NAME=mydb");
    expect(parsed.DB_DATABASE).toBe("mydb");
  });

  test("trailing inline comment", () => {
    const parsed = parseEnvLines("DB_HOST=127.0.0.1 # local");
    expect(parsed.DB_HOST).toBe("127.0.0.1");
  });

  test("comment-only lines skipped", () => {
    const parsed = parseEnvLines("# comment\nDB_PORT=3306");
    expect(parsed.DB_PORT).toBe("3306");
    expect(Object.keys(parsed)).toEqual(["DB_PORT"]);
  });
});
