import type { Connection, RowDataPacket } from "mysql2/promise";
import { queryRows } from "../mysql.ts";
import type { Schema, SchemaColumn, SchemaForeignKey, SchemaIndex, SchemaTable } from "../../shared/types.ts";

interface TableRow extends RowDataPacket {
  TABLE_NAME: string;
  ENGINE: string;
  TABLE_ROWS: number;
}

interface ColumnRow extends RowDataPacket {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_KEY: string;
  COLUMN_DEFAULT: string | null;
  COLUMN_COMMENT: string;
}

interface FkRow extends RowDataPacket {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
}

interface IndexRow extends RowDataPacket {
  TABLE_NAME: string;
  INDEX_NAME: string;
  COLUMN_NAME: string;
  NON_UNIQUE: number;
}

export async function introspectSchema(conn: Connection, database: string): Promise<Schema> {
  const tablesRaw = await queryRows<TableRow>(
    conn,
    `SELECT TABLE_NAME, ENGINE, TABLE_ROWS
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [database],
  );

  const columnsRaw = await queryRows<ColumnRow>(
    conn,
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY,
            COLUMN_DEFAULT, COLUMN_COMMENT
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [database],
  );

  const fksRaw = await queryRows<FkRow>(
    conn,
    `SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [database],
  );

  const indexesRaw = await queryRows<IndexRow>(
    conn,
    `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    [database],
  );

  const tables: SchemaTable[] = tablesRaw.map((t) => ({
    name: t.TABLE_NAME,
    engine: t.ENGINE ?? "InnoDB",
    row_count: Number(t.TABLE_ROWS ?? 0),
    columns: [],
    foreign_keys: [],
    indexes: [],
    incoming_fks: [],
  }));

  const tableMap = new Map(tables.map((t) => [t.name, t]));

  for (const col of columnsRaw) {
    const table = tableMap.get(col.TABLE_NAME);
    if (!table) continue;
    const column: SchemaColumn = {
      name: col.COLUMN_NAME,
      type: col.COLUMN_TYPE,
      nullable: col.IS_NULLABLE === "YES",
      key: col.COLUMN_KEY ?? "",
      default: col.COLUMN_DEFAULT,
      comment: col.COLUMN_COMMENT ?? "",
    };
    table.columns.push(column);
  }

  for (const fk of fksRaw) {
    const entry: SchemaForeignKey = {
      from_table: fk.TABLE_NAME,
      from_column: fk.COLUMN_NAME,
      to_table: fk.REFERENCED_TABLE_NAME,
      to_column: fk.REFERENCED_COLUMN_NAME,
    };
    const fromTable = tableMap.get(fk.TABLE_NAME);
    if (fromTable) fromTable.foreign_keys.push(entry);
    const toTable = tableMap.get(fk.REFERENCED_TABLE_NAME);
    if (toTable) toTable.incoming_fks.push(entry);
  }

  const indexMap = new Map<string, SchemaIndex>();
  for (const idx of indexesRaw) {
    const key = `${idx.TABLE_NAME}:${idx.INDEX_NAME}`;
    let entry = indexMap.get(key);
    if (!entry) {
      entry = {
        table: idx.TABLE_NAME,
        name: idx.INDEX_NAME,
        columns: [],
        is_unique: idx.NON_UNIQUE === 0,
      };
      indexMap.set(key, entry);
      const table = tableMap.get(idx.TABLE_NAME);
      if (table) table.indexes.push(entry);
    }
    entry.columns.push(idx.COLUMN_NAME);
  }

  return {
    database,
    introspected_at: new Date().toISOString(),
    tables,
  };
}

export function schemaIndexLine(table: SchemaTable): string {
  const keyCols = table.columns
    .filter((c) => c.key)
    .slice(0, 4)
    .map((c) => c.name)
    .join(", ");
  return `${table.name} — ~${table.row_count} rows. Key: ${keyCols || "—"}`;
}

export function columnsSummary(table: SchemaTable, max = 5): string {
  return table.columns
    .slice(0, max)
    .map((c) => c.name)
    .join(", ");
}
