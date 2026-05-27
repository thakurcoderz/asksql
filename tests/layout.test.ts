import { describe, expect, test } from "bun:test";
import { transcriptHeight, STATUS_ROWS, PROMPT_ROWS } from "../src/tui/layout.ts";

describe("transcriptHeight", () => {
  test("subtracts status and prompt chrome", () => {
    expect(transcriptHeight(43)).toBe(43 - STATUS_ROWS - PROMPT_ROWS);
  });

  test("never below minimum", () => {
    expect(transcriptHeight(3)).toBe(4);
  });
});
