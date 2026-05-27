import { describe, expect, test } from "bun:test";
import { resultToMarkdown } from "../src/tui/format/resultTable.ts";

describe("resultToMarkdown", () => {
  test("builds a markdown grid table", () => {
    const md = resultToMarkdown({
      columns: ["id", "email"],
      rows: [
        { id: 1, email: "a@x.com" },
        { id: 2, email: "b@x.com" },
      ],
      rowcount: 2,
      truncated: false,
    });
    expect(md).toContain("id | email");
    expect(md).toContain("--- | ---");
    expect(md).toContain("1 | a@x.com");
  });

  test("escapes pipe characters in cells", () => {
    const md = resultToMarkdown({
      columns: ["note"],
      rows: [{ note: "a|b" }],
      rowcount: 1,
      truncated: false,
    });
    expect(md).toContain("a\\|b");
  });
});
