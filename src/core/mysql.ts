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
