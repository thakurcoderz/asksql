/** Compact human-readable counts: 1234 -> "1.2k", 2_500_000 -> "2.5M". */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs < 1_000) return String(Math.round(n));
  if (abs < 1_000_000) return trimZero(n / 1_000) + "k";
  if (abs < 1_000_000_000) return trimZero(n / 1_000_000) + "M";
  return trimZero(n / 1_000_000_000) + "B";
}

function trimZero(v: number): string {
  const s = v.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** Durations in ms -> "42ms", "1.3s", "2m 05s". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0ms";
  if (ms < 1_000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${trimZero(ms / 1_000)}s`;
  const min = Math.floor(ms / 60_000);
  const sec = Math.round((ms % 60_000) / 1_000);
  return `${min}m ${String(sec).padStart(2, "0")}s`;
}

/** Coarse relative time from an ISO timestamp: "just now", "5m ago", "3h ago". */
export function relativeTime(iso: string | undefined, now = Date.now()): string {
  if (!iso) return "unknown";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "unknown";
  const diff = Math.max(0, now - then);
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
