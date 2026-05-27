import type { Schema, SchemaTable } from "../shared/types.ts";

export function generateMemory(schema: Schema): string {
  const date = new Date().toISOString().slice(0, 10);
  const tableLines = schema.tables.map((t) => formatTableLine(t)).join("\n");
  const relLines = schema.tables
    .flatMap((t) =>
      t.foreign_keys.map(
        (fk) => `- ${fk.from_table}.${fk.from_column} → ${fk.to_table}.${fk.to_column}`,
      ),
    )
    .join("\n");

  return `# ${schema.database}

_Auto-generated on ${date}. Edit freely; the agent reads this every session._

## Tables (${schema.tables.length})
${tableLines || "_No tables found._"}

## Relationships
${relLines || "_No foreign keys found._"}

## Notes
_Your free-form notes about this database. The agent reads this section but
does not edit it._

## Conventions
_The agent will append observations here. Edit your own notes above._
`;
}

function formatTableLine(table: SchemaTable): string {
  const incoming = table.incoming_fks.map((fk) => `${fk.from_table}.${fk.from_column}`).join(", ") || "—";
  const outgoing = table.foreign_keys.map((fk) => `${fk.to_table}.${fk.to_column}`).join(", ") || "—";
  return `- ${table.name} — ~${table.row_count} rows. FK from: ${incoming}. FK to: ${outgoing}.`;
}

export function appendMemorySection(fileContent: string, section: string, content: string): string {
  const heading = `## ${section}`;
  const idx = fileContent.indexOf(heading);
  if (idx === -1) throw new Error(`Section '${section}' not found in memory.md`);

  const afterHeading = idx + heading.length;
  const nextHeading = fileContent.indexOf("\n## ", afterHeading);
  const insertAt = nextHeading === -1 ? fileContent.length : nextHeading;

  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const block = `\n\n<!-- agent-added ${timestamp} -->\n${content}\n`;

  return fileContent.slice(0, insertAt) + block + fileContent.slice(insertAt);
}
