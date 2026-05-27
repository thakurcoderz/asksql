import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function installAlias(primary = "asksql"): void {
  const aliasLine = `alias ai=${primary}`;
  const shellTargets = [join(homedir(), ".zshrc"), join(homedir(), ".bashrc")];

  for (const file of shellTargets) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8");
    if (content.includes(aliasLine)) {
      console.log(`Alias already present in ${file}: ${aliasLine}`);
      continue;
    }
    appendFileSync(file, `\n# AskSQL\n${aliasLine}\n`, "utf8");
    console.log(`Added '${aliasLine}' to ${file}`);
  }
}
