import { describe, expect, test } from "bun:test";
import { formatCount, formatDuration, relativeTime } from "../src/tui/format/numbers.ts";

describe("formatCount", () => {
  test("small numbers are exact", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });
  test("thousands and millions are compact", () => {
    expect(formatCount(1234)).toBe("1.2k");
    expect(formatCount(8400)).toBe("8.4k");
    expect(formatCount(2_500_000)).toBe("2.5M");
    expect(formatCount(1_000_000_000)).toBe("1B");
  });
  test("round thousands drop the decimal", () => {
    expect(formatCount(2000)).toBe("2k");
  });
});

describe("formatDuration", () => {
  test("milliseconds", () => {
    expect(formatDuration(42)).toBe("42ms");
    expect(formatDuration(0)).toBe("0ms");
  });
  test("seconds", () => {
    expect(formatDuration(1300)).toBe("1.3s");
    expect(formatDuration(2000)).toBe("2s");
  });
  test("minutes", () => {
    expect(formatDuration(125_000)).toBe("2m 05s");
  });
  test("negative or NaN is safe", () => {
    expect(formatDuration(-5)).toBe("0ms");
    expect(formatDuration(NaN)).toBe("0ms");
  });
});

describe("relativeTime", () => {
  const now = Date.parse("2026-05-29T12:00:00Z");
  test("recent is just now", () => {
    expect(relativeTime("2026-05-29T11:59:30Z", now)).toBe("just now");
  });
  test("minutes and hours ago", () => {
    expect(relativeTime("2026-05-29T11:30:00Z", now)).toBe("30m ago");
    expect(relativeTime("2026-05-29T09:00:00Z", now)).toBe("3h ago");
  });
  test("days ago", () => {
    expect(relativeTime("2026-05-26T12:00:00Z", now)).toBe("3d ago");
  });
  test("missing or invalid is unknown", () => {
    expect(relativeTime(undefined, now)).toBe("unknown");
    expect(relativeTime("not-a-date", now)).toBe("unknown");
  });
});
