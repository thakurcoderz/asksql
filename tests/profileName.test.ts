import { describe, expect, test } from "bun:test";
import { isValidProfileName, profileDir, PROFILES_DIR } from "../src/core/paths.ts";

describe("profile name validation", () => {
  test("accepts normal names", () => {
    expect(isValidProfileName("shop")).toBe(true);
    expect(isValidProfileName("my_db-1")).toBe(true);
    expect(isValidProfileName("app.prod")).toBe(true);
  });

  test("rejects path traversal and separators", () => {
    expect(isValidProfileName("..")).toBe(false);
    expect(isValidProfileName("../etc")).toBe(false);
    expect(isValidProfileName("../../tmp/x")).toBe(false);
    expect(isValidProfileName("a/b")).toBe(false);
    expect(isValidProfileName("a\\b")).toBe(false);
    expect(isValidProfileName("foo/../bar")).toBe(false);
  });

  test("rejects empty, oversized, and null bytes", () => {
    expect(isValidProfileName("")).toBe(false);
    expect(isValidProfileName("a".repeat(65))).toBe(false);
    expect(isValidProfileName("a\0b")).toBe(false);
  });

  test("profileDir throws on traversal and stays under PROFILES_DIR otherwise", () => {
    expect(() => profileDir("../../etc")).toThrow();
    expect(profileDir("shop").startsWith(PROFILES_DIR)).toBe(true);
  });
});
