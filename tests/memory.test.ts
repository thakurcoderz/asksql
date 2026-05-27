import { describe, expect, test } from "bun:test";
import { appendMemorySection } from "../src/core/memory.ts";

describe("memory", () => {
  test("appends under section heading", () => {
    const original = `# db

## Conventions
_Edit above._

## Notes
stuff
`;
    const updated = appendMemorySection(original, "Conventions", "Always use LIMIT");
    expect(updated).toContain("<!-- agent-added");
    expect(updated).toContain("Always use LIMIT");
    expect(updated.indexOf("Always use LIMIT")).toBeLessThan(updated.indexOf("## Notes"));
  });
});
