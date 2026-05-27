import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { DbConfig } from "../shared/types.ts";
import { testConnection } from "../core/mysql.ts";
import {
  createProfile,
  profileExists,
  loadProfileConfig,
} from "../core/profiles/index.ts";

export async function promptNewProfile(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  let config: DbConfig = {
    host: "127.0.0.1",
    port: 3306,
    database: "",
    username: "root",
    password: "",
  };

  try {
    while (true) {
      const host = await rl.question(`DB_HOST [${config.host}]: `);
      config.host = host.trim() || config.host;

      const portStr = await rl.question(`DB_PORT [${config.port}]: `);
      config.port = portStr.trim() ? Number(portStr) : config.port;

      const database = await rl.question("DB_DATABASE (required): ");
      config.database = database.trim();
      if (!config.database) {
        console.error("Database name is required.");
        continue;
      }

      const username = await rl.question(`DB_USERNAME [${config.username}]: `);
      config.username = username.trim() || config.username;

      await rl.question("DB_PASSWORD: ");
      // readline doesn't mask; use a simple prompt
      const password = await rl.question("DB_PASSWORD (hidden input not supported, type carefully): ");
      config.password = password;

      if (profileExists(config.database)) {
        const overwrite = await rl.question(`Overwrite existing profile '${config.database}'? [y/N]: `);
        if (overwrite.trim().toLowerCase() !== "y") {
          console.log("Aborted.");
          return;
        }
      }

      try {
        await testConnection(config);
      } catch (e) {
        console.error("Connection failed:", e instanceof Error ? e.message : e);
        const retry = await rl.question("Retry? [Y/n]: ");
        if (retry.trim().toLowerCase() === "n") return;
        continue;
      }

      const overwrite = profileExists(config.database);
      await createProfile(config, overwrite);
      console.log(`Profile '${config.database}' created and activated.`);
      return;
    }
  } finally {
    rl.close();
  }
}

export function printProfileInfo(name: string): void {
  const config = loadProfileConfig(name);
  console.log(`${name}: ${config.username}@${config.host}:${config.port}/${config.database}`);
}
