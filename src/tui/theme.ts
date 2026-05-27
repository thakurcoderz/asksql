import { RGBA, SyntaxStyle } from "@opentui/core";

export const theme = {
  fg: "#E6EDF3",
  fgMuted: "#8B949E",
  fgDim: "#6E7681",
  accent: "#58A6FF",
  safe: "#3FB950",
  warn: "#D29922",
  danger: "#F85149",
  sqlAccent: "#39C5CF",
  errorAccent: "#F85149",
  bg: "#0D1117",
  bgElevated: "#161B22",
  bgCard: "#0D1117",
  border: "#30363D",
  borderMuted: "#21262D",
  slashPick: "#C67B4E",
  slashPickFg: "#0D1117",
};

export const syntaxStyle = SyntaxStyle.fromStyles({
  keyword: { fg: RGBA.fromHex("#FF7B72"), bold: true },
  string: { fg: RGBA.fromHex("#A5D6FF") },
  comment: { fg: RGBA.fromHex("#8B949E"), italic: true },
  number: { fg: RGBA.fromHex("#79C0FF") },
  function: { fg: RGBA.fromHex("#D2A8FF") },
  default: { fg: RGBA.fromHex("#E6EDF3") },
  "markup.heading.1": { fg: RGBA.fromHex("#58A6FF"), bold: true },
  "markup.heading.2": { fg: RGBA.fromHex("#58A6FF"), bold: true },
  "markup.list": { fg: RGBA.fromHex("#E6EDF3") },
  "markup.raw": { fg: RGBA.fromHex("#A5D6FF") },
});

export const gridTableOptions = {
  style: "grid" as const,
  widthMode: "full" as const,
  columnFitter: "balanced" as const,
  wrapMode: "word" as const,
  cellPadding: 1,
  borders: true,
  outerBorder: true,
  borderStyle: "rounded" as const,
  borderColor: theme.border,
};

export function modeColor(mode: string): string {
  if (mode === "confirm") return theme.warn;
  if (mode === "yolo") return theme.danger;
  return theme.safe;
}
