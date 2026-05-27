import { describe, expect, test } from "bun:test";
import { layoutResultTable } from "../src/tui/format/tableLayout.ts";

describe("layoutResultTable", () => {
  test("fits rows within terminal width", () => {
    const layout = layoutResultTable(
      {
        columns: ["id", "email", "first_name", "last_name", "last_logged_in_at", "updated_at"],
        rows: [
          {
            id: 53,
            email: "user@demo.com",
            first_name: "FN",
            last_name: "LN",
            last_logged_in_at: "2026-05-19 07:35:59",
            updated_at: "2026-05-19 07:35:59",
          },
        ],
        rowcount: 1,
        truncated: false,
      },
      100,
    );
    expect(layout).not.toBeNull();
    expect(layout!.header.length).toBeLessThanOrEqual(100);
    expect(layout!.rows[0]!.length).toBeLessThanOrEqual(100);
  });

  test("hides low-priority columns when space is tight", () => {
    const layout = layoutResultTable(
      {
        columns: [
          "id",
          "email",
          "first_name",
          "last_name",
          "last_logged_in_at",
          "updated_at",
          "deleted_at",
          "inactivated_at",
        ],
        rows: [
          {
            id: 1,
            email: "a@b.com",
            first_name: "A",
            last_name: "B",
            last_logged_in_at: "2026-05-19",
            updated_at: "2026-05-19",
            deleted_at: null,
            inactivated_at: null,
          },
        ],
        rowcount: 1,
        truncated: false,
      },
      50,
    );
    expect(layout!.hiddenColumns.length).toBeGreaterThan(0);
    expect(layout!.header).toContain("email");
  });

  test("gives email extra width before redundant role columns", () => {
    const layout = layoutResultTable(
      {
        columns: ["id", "email", "role_name", "role_display_name"],
        rows: [
          {
            id: 923,
            email: "user_923@demo.example.com",
            role_name: "Caregiver",
            role_display_name: "Caregiver",
          },
        ],
        rowcount: 1,
        truncated: false,
      },
      100,
    );
    expect(layout!.rows[0]).toContain("user_923@demo.example.com");
    expect(layout!.rows[0]).not.toMatch(/user_…/);
  });
});
