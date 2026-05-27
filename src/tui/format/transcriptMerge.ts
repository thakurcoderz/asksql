import type { TranscriptBlock } from "../../shared/types.ts";

/** Within each user turn, only the last execution block stays expanded. */
export function collapsedExecutionIds(blocks: TranscriptBlock[]): Set<string> {
  const collapsed = new Set<string>();
  let turnExecutions: string[] = [];

  const flush = () => {
    if (turnExecutions.length > 1) {
      for (let i = 0; i < turnExecutions.length - 1; i++) {
        collapsed.add(turnExecutions[i]!);
      }
    }
    turnExecutions = [];
  };

  for (const block of blocks) {
    if (block.kind === "user") flush();
    if (block.kind === "execution") turnExecutions.push(block.id);
  }
  flush();

  return collapsed;
}

export function mergeTranscriptBlocks(blocks: TranscriptBlock[]): TranscriptBlock[] {
  const merged: TranscriptBlock[] = [];

  for (const block of blocks) {
    const prev = merged[merged.length - 1];
    if (block.kind === "schema" && prev?.kind === "schema") {
      merged[merged.length - 1] = {
        ...prev,
        tables: [...prev.tables, ...block.tables],
      };
      continue;
    }
    if (block.kind === "thinking") {
      if (prev?.kind === "thinking") continue;
    }
    merged.push(block);
  }

  return merged;
}
