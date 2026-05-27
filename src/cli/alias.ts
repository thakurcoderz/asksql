import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export function installAlias(name = "asksql"): void {
  const aliasLine = `alias ai=${name}`;
  const targets = [join(homedir(), ".zshrc"), join(homedir(), ".bashrc")];

  for (const file of targets) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8");
    if (content.includes(aliasLine) || content.includes(`alias ai=${name}`)) {
      console.log(`Alias already present in ${file}`);
      continue;
    }
    appendFileSync(file, `\n# AskSQL\n${aliasLine}\n`, "utf8");
    console.log(`Added '${aliasLine}' to ${file}`);
  }
}
