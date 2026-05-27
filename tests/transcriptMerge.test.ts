import { describe, expect, test } from "bun:test";
import { collapsedExecutionIds } from "../src/tui/format/transcriptMerge.ts";

describe("collapsedExecutionIds", () => {
  test("collapses earlier executions in the same turn", () => {
    const collapsed = collapsedExecutionIds([
      { id: "u1", kind: "user", text: "q" },
      { id: "e1", kind: "execution", tool: "run_sql_read", sql: "SELECT 1" },
      { id: "e2", kind: "execution", tool: "run_sql_read", sql: "SELECT 2" },
    ]);
    expect(collapsed.has("e1")).toBe(true);
    expect(collapsed.has("e2")).toBe(false);
  });

  test("does not collapse the only execution in a turn", () => {
    const collapsed = collapsedExecutionIds([
      { id: "u1", kind: "user", text: "q" },
      { id: "e1", kind: "execution", tool: "run_sql_read", sql: "SELECT 1" },
    ]);
    expect(collapsed.size).toBe(0);
  });
});
