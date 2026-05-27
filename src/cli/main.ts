#!/usr/bin/env bun
import { defineCommand, runMain } from "citty";
import { loadEnvCascade, requireOpenRouterKey, getModel, getDefaultMode } from "../core/env.ts";
import { loadConfig, saveConfig, setActiveProfile } from "../core/config.ts";
import {
  listProfiles,
  removeProfile,
  renameProfile,
  resolveActiveProfile,
  profileExists,
} from "../core/profiles/index.ts";
import { promptNewProfile } from "./new.ts";
import { installAlias } from "./alias.ts";
import { runAsk } from "./ask.ts";
import { launchTui } from "../tui/main.tsx";

async function launchDefaultTui(profile?: string) {
  loadEnvCascade();
  requireOpenRouterKey();
  if (profile) setActiveProfile(profile);
  await launchTui();
}

const main = defineCommand({
  meta: {
    name: "asksql",
    description: "AskSQL — natural-language MySQL assistant powered by OpenRouter",
  },
  args: {
    profile: {
      type: "string",
      alias: "p",
      description: "Active profile for this session",
    },
  },
  subCommands: {
    new: defineCommand({
      meta: { description: "Create a new database profile (opens in TUI if available)" },
      run: async () => {
        loadEnvCascade();
        requireOpenRouterKey();
        await promptNewProfile();
      },
    }),
    connect: defineCommand({
      meta: { description: "Switch active profile" },
      args: { name: { type: "positional", required: true } },
      run: async ({ args }) => {
        loadEnvCascade();
        requireOpenRouterKey();
        const name = String(args.name);
        if (!profileExists(name)) {
          console.error(`Profile '${name}' not found`);
          process.exit(1);
        }
        setActiveProfile(name);
        console.log(`Active profile: ${name}`);
      },
    }),
    list: defineCommand({
      meta: { description: "List profiles" },
      run: async () => {
        loadEnvCascade();
        requireOpenRouterKey();
        const active = loadConfig().active_profile;
        for (const name of listProfiles()) {
          const marker = name === active ? " *" : "";
          console.log(`${name}${marker}`);
        }
      },
    }),
    remove: defineCommand({
      meta: { description: "Remove a profile" },
      args: { name: { type: "positional", required: true } },
      run: async ({ args }) => {
        loadEnvCascade();
        requireOpenRouterKey();
        const name = String(args.name);
        process.stdout.write(`Delete profile '${name}'? [y/N]: `);
        const answer = await new Promise<string>((resolve) => {
          process.stdin.once("data", (d) => resolve(d.toString().trim()));
        });
        if (answer.toLowerCase() !== "y") {
          console.log("Aborted.");
          return;
        }
        removeProfile(name);
        console.log(`Removed profile '${name}'`);
      },
    }),
    rename: defineCommand({
      meta: { description: "Rename a profile" },
      args: {
        old: { type: "positional", required: true },
        new: { type: "positional", required: true },
      },
      run: async ({ args }) => {
        loadEnvCascade();
        requireOpenRouterKey();
        renameProfile(String(args.old), String(args.new));
        console.log(`Renamed '${args.old}' → '${args.new}'`);
      },
    }),
    ask: defineCommand({
      meta: { description: "One-shot question (non-interactive)" },
      args: { question: { type: "positional", required: true } },
      run: async ({ args }) => {
        loadEnvCascade();
        requireOpenRouterKey();
        const profile = resolveActiveProfile();
        if (!profile) {
          console.error("No active profile. Run asksql and use /new or /connect <name>");
          process.exit(1);
        }
        const config = loadConfig();
        await runAsk({
          profile,
          question: String(args.question),
          mode: config.default_mode ?? getDefaultMode(),
          model: getModel(),
        });
      },
    }),
    tui: defineCommand({
      meta: { description: "Launch full-screen TUI (same as bare asksql)" },
      args: { profile: { type: "string", alias: "p" } },
      run: async ({ args }) => {
        await launchDefaultTui(args.profile ? String(args.profile) : undefined);
      },
    }),
    alias: defineCommand({
      meta: { description: "Install shell alias (ai=asksql)" },
      args: { name: { type: "string", default: "asksql" } },
      run: async ({ args }) => {
        installAlias(String(args.name));
      },
    }),
  },
  default: "tui",
});

loadEnvCascade();

runMain(main);
