/** Strip row dumps from answers when results already rendered inline. */
export function sanitizeAnswerAfterResult(content: string): string {
  const lines = content.split("\n");
  const kept: string[] = [];
  let inTable = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (!inTable && kept.length > 0 && kept[kept.length - 1] !== "") kept.push("");
      inTable = false;
      continue;
    }

    if (/^\|/.test(t)) {
      inTable = true;
      continue;
    }
    if (inTable) continue;

    if (/^[-*+]\s/.test(t)) continue;
    if (/^\d+[.)]\s/.test(t)) continue;
    if (/^here are \d+/i.test(t)) continue;
    if (/^example list/i.test(t)) continue;
    kept.push(line);
  }

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
