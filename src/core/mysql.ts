import type { Connection, RowDataPacket } from "mysql2/promise";
import mysql from "mysql2/promise";
import type { DbConfig } from "../shared/types.ts";

export async function testConnection(config: DbConfig): Promise<void> {
  const conn = await mysql.createConnection(toMysqlOptions(config));
  try {
    await conn.query("SELECT 1");
  } finally {
    await conn.end();
  }
}

export async function createConnection(config: DbConfig): Promise<Connection> {
  return mysql.createConnection(toMysqlOptions(config));
}

export async function queryRows<T extends RowDataPacket>(
  conn: Connection,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await conn.query<T[]>(sql, params);
  return rows;
}

/**
 * Run a query inside a `READ ONLY` transaction with a server-side row cap.
 *
 * - `START TRANSACTION READ ONLY` makes MySQL reject any data- or schema-
 *   modifying statement ("Cannot execute statement in a READ ONLY
 *   transaction"), a database-enforced guarantee that does not depend on the
 *   SQL classifier being perfect.
 * - `SQL_SELECT_LIMIT` caps the rows the server returns for any SELECT that
 *   has no explicit outer LIMIT, bounding client memory even when ensureLimit
 *   was skipped (e.g. a LIMIT token hidden inside a subquery). This is the
 *   memory-exhaustion net. Note: an explicit outer LIMIT in the query takes
 *   precedence over SQL_SELECT_LIMIT per MySQL semantics, so a deliberately
 *   huge explicit LIMIT is not bounded by this alone.
 *
 * Used for the agent's read-only tool. The caller closes the connection, so
 * the session settings never leak to a later query.
 */
export async function queryRowsReadOnly<T extends RowDataPacket>(
  conn: Connection,
  sql: string,
  params: unknown[] = [],
  maxRows = 5_000,
): Promise<T[]> {
  await conn.query("START TRANSACTION READ ONLY");
  // Cap is integer-validated here, never interpolated from user/model input.
  const cap = Math.max(1, Math.floor(maxRows));
  await conn.query(`SET SESSION SQL_SELECT_LIMIT = ${cap}`);
  try {
    const [rows] = await conn.query<T[]>(sql, params);
    return rows;
  } finally {
    try {
      await conn.query("SET SESSION SQL_SELECT_LIMIT = DEFAULT");
      await conn.query("ROLLBACK");
    } catch {
      // best-effort cleanup; connection is closed by the caller regardless
    }
  }
}

export async function executeWrite(conn: Connection, sql: string): Promise<number> {
  const [result] = await conn.query(sql);
  const info = result as { affectedRows?: number };
  return info.affectedRows ?? 0;
}

function toMysqlOptions(config: DbConfig) {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    multipleStatements: false,
  };
}
