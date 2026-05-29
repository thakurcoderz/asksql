import { describe, expect, test } from "bun:test";
import type { Connection, RowDataPacket } from "mysql2/promise";
import { queryRowsReadOnly } from "../src/core/mysql.ts";

function mockConnection(): { conn: Connection; queries: string[] } {
  const queries: string[] = [];
  const conn = {
    async query(sql: string) {
      queries.push(sql);
      if (/^\s*SELECT/i.test(sql)) return [[{ n: 1 }] as RowDataPacket[], []];
      return [{ affectedRows: 0 }, []];
    },
  } as unknown as Connection;
  return { conn, queries };
}

describe("queryRowsReadOnly", () => {
  test("opens a READ ONLY transaction, caps rows, then rolls back", async () => {
    const { conn, queries } = mockConnection();
    const rows = await queryRowsReadOnly<RowDataPacket>(conn, "SELECT * FROM t", [], 5000);

    expect(rows).toEqual([{ n: 1 }] as RowDataPacket[]);
    expect(queries[0]).toBe("START TRANSACTION READ ONLY");
    expect(queries[1]).toBe("SET SESSION SQL_SELECT_LIMIT = 5000");
    expect(queries).toContain("SELECT * FROM t");
    expect(queries).toContain("ROLLBACK");
    expect(queries).toContain("SET SESSION SQL_SELECT_LIMIT = DEFAULT");
    // limit set before the query runs
    expect(queries.indexOf("SET SESSION SQL_SELECT_LIMIT = 5000")).toBeLessThan(
      queries.indexOf("SELECT * FROM t"),
    );
  });

  test("rolls back even when the query throws", async () => {
    const queries: string[] = [];
    const conn = {
      async query(sql: string) {
        queries.push(sql);
        if (/^\s*SELECT/i.test(sql)) throw new Error("boom");
        return [{ affectedRows: 0 }, []];
      },
    } as unknown as Connection;

    await expect(queryRowsReadOnly(conn, "SELECT 1")).rejects.toThrow("boom");
    expect(queries).toContain("ROLLBACK");
  });

  test("clamps a fractional or tiny cap to a positive integer", async () => {
    const { conn, queries } = mockConnection();
    await queryRowsReadOnly(conn, "SELECT 1", [], 0.4);
    expect(queries).toContain("SET SESSION SQL_SELECT_LIMIT = 1");
  });
});
