import { describe, expect, test } from "bun:test";
import { sanitizeAnswerAfterResult } from "../src/tui/format/answerSanitize.ts";

describe("sanitizeAnswerAfterResult", () => {
  test("removes bullet lists and preamble", () => {
    const raw = `Here are 5 users from users (example list):
- 16 - admin@x.com
- 247 - ajia@x.com

No is_active column was found — tell me which column defines active.`;

    const out = sanitizeAnswerAfterResult(raw);
    expect(out).not.toContain("admin@x.com");
    expect(out).toContain("is_active");
  });
});
