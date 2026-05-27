/** Fixed chrome row counts for the TUI shell. */
export const STATUS_ROWS = 1;
export const PROMPT_ROWS = 3;

export function transcriptHeight(termHeight: number): number {
  return Math.max(4, termHeight - STATUS_ROWS - PROMPT_ROWS);
}
