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
 * Run a query inside a `READ ONLY` transaction. MySQL rejects any data- or
 * schema-modifying statement in such a transaction ("Cannot execute statement
 * in a READ ONLY transaction"), giving a database-enforced guarantee that does
 * not depend on the SQL classifier being perfect. Used for the agent's
 * read-only tool so a misclassified write can never mutate data.
 */
export async function queryRowsReadOnly<T extends RowDataPacket>(
  conn: Connection,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  await conn.query("START TRANSACTION READ ONLY");
  try {
    const [rows] = await conn.query<T[]>(sql, params);
    return rows;
  } finally {
    try {
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
