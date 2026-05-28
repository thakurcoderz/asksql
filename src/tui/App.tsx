import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { getModel, getDefaultMode } from "../core/env.ts";
import { resolveActiveScope, scopeToAgentScope, setActiveProfile, setActiveProject, loadConfig, saveConfig } from "../core/config.ts";
import { ProfileSetupOverlay } from "./components/ProfileSetupOverlay.tsx";
import { ProjectSetupOverlay } from "./components/ProjectSetupOverlay.tsx";
import { NoProfileState } from "./components/NoProfileState.tsx";
import {
  listProfiles,
  loadProfileConfig,
  profileExists,
} from "../core/profiles/index.ts";
import {
  listProjects,
  loadProject,
  projectExists,
  addProfileToProject,
  resolveProjectProfiles,
} from "../core/projects/index.ts";
import { readFileSync } from "node:fs";
import { schemaPath, memoryPath } from "../core/paths.ts";
import type { Schema, SafetyMode, AgentEvent, ChatTurn } from "../shared/types.ts";
import { MAX_CHAT_HISTORY } from "../shared/types.ts";
import { runAgentTurn, refreshSchema } from "../core/agent/index.ts";
import { appReducer, uid, canChat, type AppState } from "./state/store.ts";
import { StatusStrip } from "./components/StatusStrip.tsx";
import { Transcript } from "./components/Transcript.tsx";
import { PromptBar } from "./components/PromptBar.tsx";
import { ConfirmOverlay } from "./components/ConfirmOverlay.tsx";
import { CommandPalette, HelpOverlay } from "./components/CommandPalette.tsx";
import { SlashAutocomplete } from "./components/SlashAutocomplete.tsx";
import { computeGhost, getSlashSuggestions, shouldShowSlashMenu } from "./autocomplete.ts";
import { theme } from "./theme.ts";
import { setupKeymap } from "./keymap.ts";

function loadSchemaTables(profile: string): string[] {
  try {
    const schema = JSON.parse(readFileSync(schemaPath(profile), "utf8")) as Schema;
    return schema.tables.map((t) => t.name);
  } catch {
    return [];
  }
}

function buildInitialState(): AppState {
  const config = loadConfig();
  const activeScope = resolveActiveScope();

  let scopeKind: AppState["scopeKind"] = "none";
  let profile: string | null = null;
  let project: string | null = null;
  let projectProfiles: string[] = [];
  let database = "";

  if (activeScope?.kind === "profile") {
    scopeKind = "profile";
    profile = activeScope.name;
    database = loadProfileConfig(activeScope.name).database;
  } else if (activeScope?.kind === "project") {
    scopeKind = "project";
    project = activeScope.name;
    projectProfiles = activeScope.profiles;
  }

  return {
    scopeKind,
    profile,
    project,
    projectProfiles,
    database,
    mode: config.default_mode ?? getDefaultMode(),
    model: config.default_model ?? getModel(),
    blocks: [],
    input: "",
    ghost: "",
    slashPickIndex: 0,
    busy: false,
    paletteOpen: false,
    helpOpen: false,
    confirm: null,
    inspectorOpen: false,
    profileSetupOpen: false,
    projectSetupOpen: false,
  };
}

function App() {
  const renderer = useRenderer();
  const initial = buildInitialState();

  const [state, dispatch] = useReducer(appReducer, initial);
  const [inputKey, setInputKey] = useReducer((n: number) => n + 1, 0);
  const confirmResolver = useRef<((v: boolean) => void) | null>(null);
  const chunkBuffer = useRef("");
  const chunkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerId = useRef<string | null>(null);
  const chatHistoryRef = useRef<ChatTurn[]>([]);

  const profiles = listProfiles();
  const projects = listProjects();
  const schemaProfile =
    state.scopeKind === "profile"
      ? state.profile
      : state.projectProfiles[0] ?? null;
  const tables = schemaProfile ? loadSchemaTables(schemaProfile) : [];

  const slashSuggestions = useMemo(
    () => getSlashSuggestions(state.input, profiles, tables, projects),
    [state.input, profiles, tables, projects],
  );

  const promptDisabled =
    state.busy || !!state.confirm || state.profileSetupOpen || state.projectSetupOpen;
  const showSlashMenu =
    !promptDisabled && shouldShowSlashMenu(state.input, slashSuggestions);
  const slashPickIndex = showSlashMenu
    ? Math.min(state.slashPickIndex, Math.max(0, slashSuggestions.length - 1))
    : 0;

  const acceptSlashSuggestion = useCallback(() => {
    if (!showSlashMenu || slashSuggestions.length === 0) return false;
    const value = slashSuggestions[slashPickIndex]?.value ?? slashSuggestions[0]!.value;
    dispatch({ type: "accept-slash-suggestion", value });
    return true;
  }, [showSlashMenu, slashSuggestions, slashPickIndex]);

  const flushChunks = useCallback(() => {
    if (!answerId.current || !chunkBuffer.current) return;
    dispatch({ type: "append-answer", id: answerId.current, chunk: chunkBuffer.current });
    chunkBuffer.current = "";
  }, []);

  const handleAgentEvent = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case "thinking":
          dispatch({ type: "sync-thinking" });
          break;
        case "schema": {
          const profileForSchema = event.profile ?? state.profile;
          if (!profileForSchema) break;
          const schema = JSON.parse(readFileSync(schemaPath(profileForSchema), "utf8")) as Schema;
          dispatch({
            type: "add-block",
            block: {
              id: uid("schema"),
              kind: "schema",
              profile: event.profile,
              tables: event.tables.map((name) => ({
                name,
                colCount: schema.tables.find((t) => t.name === name)?.columns.length ?? 0,
              })),
            },
          });
          break;
        }
        case "execution":
          dispatch({ type: "clear-thinking" });
          dispatch({
            type: "add-block",
            block: {
              id: uid("exec"),
              kind: "execution",
              tool: event.tool,
              sql: event.sql,
              profile: event.profile,
              result: event.result,
              writeResult: event.writeResult,
              error: event.error,
            },
          });
          break;
        case "memory":
          dispatch({
            type: "add-block",
            block: {
              id: uid("mem"),
              kind: "memory",
              section: event.section,
              profile: event.profile,
            },
          });
          break;
        case "answer-chunk": {
          dispatch({ type: "clear-thinking" });
          if (!answerId.current) {
            answerId.current = uid("ans");
            dispatch({
              type: "add-block",
              block: { id: answerId.current, kind: "answer", content: "", streaming: true },
            });
          }
          chunkBuffer.current += event.content;
          if (!chunkTimer.current) {
            chunkTimer.current = setTimeout(() => {
              flushChunks();
              chunkTimer.current = null;
            }, 50);
          }
          break;
        }
        case "answer-clear":
          if (answerId.current) {
            dispatch({ type: "clear-answer", id: answerId.current });
            answerId.current = null;
            chunkBuffer.current = "";
          }
          break;
        case "answer-done":
          flushChunks();
          if (answerId.current) {
            dispatch({ type: "finalize-answer", id: answerId.current, content: event.content });
          }
          answerId.current = null;
          break;
        case "error":
          dispatch({ type: "add-block", block: { id: uid("err"), kind: "error", message: event.message } });
          break;
        case "done":
          dispatch({ type: "clear-thinking" });
          dispatch({ type: "set-busy", busy: false });
          break;
      }
    },
    [flushChunks, state.profile, state.projectProfiles],
  );

  const agentScope = useMemo(() => {
    if (state.scopeKind === "profile" && state.profile) {
      return { kind: "profile" as const, profileName: state.profile };
    }
    if (state.scopeKind === "project" && state.project) {
      return {
        kind: "project" as const,
        projectName: state.project,
        profileNames: state.projectProfiles,
      };
    }
    return null;
  }, [state.scopeKind, state.profile, state.project, state.projectProfiles]);

  const runQuestion = useCallback(
    async (question: string) => {
      if (!agentScope || state.busy) return;
      dispatch({ type: "add-block", block: { id: uid("user"), kind: "user", text: question } });
      dispatch({ type: "set-input", value: "", ghost: "" });
      setInputKey();
      dispatch({ type: "set-busy", busy: true });
      answerId.current = null;

      try {
        const prior = chatHistoryRef.current;
        const answer = await runAgentTurn(
          {
            scope: agentScope,
            mode: state.mode,
            model: state.model,
            onEvent: handleAgentEvent,
            onConfirm: (reason, sql) =>
              new Promise<boolean>((resolve) => {
                const id = uid("confirm");
                confirmResolver.current = resolve;
                dispatch({ type: "set-confirm", confirm: { id, reason, sql } });
              }),
          },
          question,
          prior,
        );

        const next: ChatTurn[] = [{ role: "user", content: question }];
        if (answer.trim()) next.push({ role: "assistant", content: answer });
        chatHistoryRef.current = [...prior, ...next].slice(-MAX_CHAT_HISTORY);
      } catch (e) {
        dispatch({
          type: "add-block",
          block: {
            id: uid("err"),
            kind: "error",
            message: e instanceof Error ? e.message : String(e),
          },
        });
        dispatch({ type: "set-busy", busy: false });
      }
    },
    [agentScope, state.busy, state.mode, state.model, handleAgentEvent],
  );

  const handleSlash = useCallback(
    async (line: string) => {
      const parts = line.trim().split(/\s+/);
      const cmd = parts[0]!.toLowerCase();

      const reply = (content: string) => {
        dispatch({
          type: "add-block",
          block: { id: uid("ans"), kind: "answer", content, streaming: false },
        });
      };

      const startNewChat = (note?: string) => {
        chatHistoryRef.current = [];
        dispatch({ type: "clear" });
        if (note) reply(note);
      };

      const listProfileLines = () =>
        profiles.map((p) => `- ${p}${p === state.profile ? " (active)" : ""}`).join("\n");

      const listProjectLines = () =>
        projects
          .map((p) => {
            const proj = loadProject(p);
            const active = p === state.project ? " (active)" : "";
            return `- ${p}${active}: ${proj.profiles.join(", ")}`;
          })
          .join("\n");

      const switchProfile = (name: string) => {
        if (!profileExists(name)) {
          dispatch({
            type: "add-block",
            block: { id: uid("err"), kind: "error", message: `Profile '${name}' not found` },
          });
          return;
        }
        setActiveProfile(name);
        const cfg = loadProfileConfig(name);
        chatHistoryRef.current = [];
        dispatch({ type: "clear" });
        dispatch({ type: "set-profile", profile: name, database: cfg.database });
        reply(
          `Using **${name}** (${cfg.username}@${cfg.host}/${cfg.database}). New chat started.`,
        );
      };

      const switchProject = (name: string) => {
        if (!projectExists(name)) {
          dispatch({
            type: "add-block",
            block: { id: uid("err"), kind: "error", message: `Project '${name}' not found` },
          });
          return;
        }
        const memberProfiles = resolveProjectProfiles(name);
        setActiveProject(name);
        chatHistoryRef.current = [];
        dispatch({ type: "clear" });
        dispatch({ type: "set-project", project: name, profiles: memberProfiles });
        reply(
          `Project **${name}** (${memberProfiles.length} DBs: ${memberProfiles.join(", ")}). New chat started — specify profile in tool calls.`,
        );
      };

      switch (cmd) {
        case "/help":
          dispatch({ type: "toggle-help" });
          break;
        case "/new":
        case "/chat":
        case "/clear":
          startNewChat("New chat started — ask your next question in plain English.");
          break;
        case "/quit":
        case "/exit":
          renderer.destroy();
          break;
        case "/profiles":
          if (profiles.length === 0) {
            reply("No connections yet. Run `/profile new`.");
            break;
          }
          reply(listProfileLines());
          break;
        case "/profile": {
          const sub = parts[1]?.toLowerCase();
          if (sub === "new" || sub === "add") {
            dispatch({ type: "set-profile-setup", open: true });
            break;
          }
          if (sub === "list" || !sub) {
            if (profiles.length === 0) {
              reply("No connections yet. Run `/profile new`.");
            } else {
              reply(listProfileLines());
            }
            break;
          }
          switchProfile(parts[1]!);
          break;
        }
        case "/use":
        case "/connect": {
          const name = parts[1];
          if (!name) {
            reply("Usage: /use <profile>  (alias: /connect)");
            break;
          }
          switchProfile(name);
          break;
        }
        case "/project": {
          const sub = parts[1]?.toLowerCase();
          if (sub === "new") {
            dispatch({ type: "set-project-setup", open: true });
            break;
          }
          if (sub === "list" || !sub) {
            if (projects.length === 0) {
              reply("No projects yet. Run `/project new`.");
            } else {
              reply(listProjectLines());
            }
            break;
          }
          if (sub === "use") {
            const name = parts[2];
            if (!name) {
              reply("Usage: /project use <name>");
              break;
            }
            switchProject(name);
            break;
          }
          if (sub === "add") {
            const profileName = parts[2];
            if (!state.project) {
              reply("No active project. Run `/project use <name>` first.");
              break;
            }
            if (!profileName) {
              reply("Usage: /project add <profile>");
              break;
            }
            try {
              addProfileToProject(state.project, profileName);
              const updated = resolveProjectProfiles(state.project);
              dispatch({ type: "set-project", project: state.project, profiles: updated });
              reply(`Added **${profileName}** to project **${state.project}**.`);
            } catch (e) {
              dispatch({
                type: "add-block",
                block: {
                  id: uid("err"),
                  kind: "error",
                  message: e instanceof Error ? e.message : String(e),
                },
              });
            }
            break;
          }
          switchProject(parts[1]!);
          break;
        }
        case "/mode": {
          const mode = parts[1] as SafetyMode;
          if (mode === "safe" || mode === "confirm" || mode === "yolo") {
            dispatch({ type: "set-mode", mode });
            const c = loadConfig();
            c.default_mode = mode;
            saveConfig(c);
          }
          break;
        }
        case "/model": {
          const model = parts.slice(1).join(" ");
          if (model) {
            dispatch({ type: "set-model", model });
            const c = loadConfig();
            c.default_model = model;
            saveConfig(c);
          }
          break;
        }
        case "/refresh":
          if (state.scopeKind === "profile" && state.profile) {
            await refreshSchema(state.profile);
          } else if (state.scopeKind === "project") {
            for (const p of state.projectProfiles) {
              await refreshSchema(p);
            }
            reply(`Refreshed schema for ${state.projectProfiles.length} profile(s).`);
          }
          break;
        case "/schema": {
          const table = parts[1];
          if (state.profile && table) {
            const schema = JSON.parse(readFileSync(schemaPath(state.profile), "utf8")) as Schema;
            const t = schema.tables.find((x) => x.name.toLowerCase() === table.toLowerCase());
            dispatch({
              type: "add-block",
              block: {
                id: uid("ans"),
                kind: "answer",
                content: t
                  ? t.columns.map((c) => `- ${c.name}: ${c.type}`).join("\n")
                  : `Table '${table}' not found`,
                streaming: false,
              },
            });
          } else if (state.profile) {
            const schema = JSON.parse(readFileSync(schemaPath(state.profile), "utf8")) as Schema;
            dispatch({
              type: "add-block",
              block: {
                id: uid("ans"),
                kind: "answer",
                content: schema.tables.map((t) => `- ${t.name} (~${t.row_count} rows)`).join("\n"),
                streaming: false,
              },
            });
          }
          break;
        }
        case "/memory":
          if (state.profile) {
            dispatch({
              type: "add-block",
              block: {
                id: uid("ans"),
                kind: "answer",
                content: memoryPath(state.profile),
                streaming: false,
              },
            });
          }
          break;
      }
    },
    [profiles, projects, renderer, state.profile, state.project, state.projectProfiles, state.scopeKind],
  );

  const handleSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("/")) {
        await handleSlash(trimmed);
        dispatch({ type: "set-input", value: "", ghost: "" });
        setInputKey();
        return;
      }
      if (!canChat(state)) {
        dispatch({
          type: "add-block",
          block: {
            id: uid("err"),
            kind: "error",
            message: "Connect first: /profile new, /use <name>, or /project use <name>",
          },
        });
        dispatch({ type: "set-input", value: "", ghost: "" });
        setInputKey();
        return;
      }
      await runQuestion(trimmed);
    },
    [handleSlash, runQuestion, state],
  );

  useEffect(() => {
    if (profiles.length === 0 && !state.profile) {
      dispatch({ type: "set-profile-setup", open: true });
    }
  }, []);

  useEffect(() => {
    setupKeymap(renderer, {
      onPalette: () => dispatch({ type: "set-palette", open: true }),
      onClear: () => {
        chatHistoryRef.current = [];
        dispatch({ type: "clear" });
      },
      onRefresh: () => {
        if (state.scopeKind === "profile" && state.profile) {
          refreshSchema(state.profile).catch(console.error);
        } else if (state.scopeKind === "project") {
          for (const p of state.projectProfiles) {
            refreshSchema(p).catch(console.error);
          }
        }
      },
      onQuit: () => renderer.destroy(),
      onAcceptGhost: () => {
        if (!acceptSlashSuggestion()) {
          dispatch({ type: "accept-ghost" });
        }
      },
    });
  }, [renderer, state.scopeKind, state.profile, state.projectProfiles, acceptSlashSuggestion]);

  useKeyboard((key) => {
    if (showSlashMenu) {
      if (key.name === "up") {
        const next =
          (slashPickIndex - 1 + slashSuggestions.length) % slashSuggestions.length;
        dispatch({ type: "set-slash-pick", index: next });
        return;
      }
      if (key.name === "down") {
        const next = (slashPickIndex + 1) % slashSuggestions.length;
        dispatch({ type: "set-slash-pick", index: next });
        return;
      }
    }

    if (state.helpOpen && key.name === "escape") {
      dispatch({ type: "set-help", open: false });
      return;
    }
    if (state.paletteOpen && key.name === "escape") {
      dispatch({ type: "set-palette", open: false });
      return;
    }

    if (state.projectSetupOpen && key.name === "escape") {
      dispatch({ type: "set-project-setup", open: false });
      return;
    }
    if (state.profileSetupOpen && key.name === "escape") {
      dispatch({ type: "set-profile-setup", open: false });
      return;
    }
    if (!state.confirm) return;

    if (key.name === "y") {
      confirmResolver.current?.(true);
      confirmResolver.current = null;
      dispatch({ type: "set-confirm", confirm: null });
    }
    if (key.name === "n" || key.name === "escape") {
      confirmResolver.current?.(false);
      confirmResolver.current = null;
      dispatch({ type: "set-confirm", confirm: null });
    }
  });

  useEffect(() => {
    const ghost = computeGhost(state.input, profiles, tables, projects);
    if (ghost !== state.ghost) {
      dispatch({ type: "set-input", value: state.input, ghost });
    }
  }, [state.input, profiles, tables, projects]);

  const showTranscript = canChat(state) || state.blocks.length > 0;

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        backgroundColor: theme.bg,
      }}
    >
      <StatusStrip
        scopeKind={state.scopeKind}
        profile={state.profile}
        project={state.project}
        projectProfileCount={state.projectProfiles.length}
        mode={state.mode}
        model={state.model}
      />
      <box
        style={{
          flexGrow: 1,
          minHeight: 0,
          flexShrink: 1,
          flexDirection: "column",
          width: "100%",
        }}
      >
        {showTranscript ? (
          <Transcript
            blocks={state.blocks}
            database={state.database}
            onExample={(q) => handleSubmit(q)}
          />
        ) : (
          <NoProfileState profiles={profiles} />
        )}
      </box>
      <box style={{ position: "relative", width: "100%", flexShrink: 0 }}>
        {showSlashMenu && (
          <SlashAutocomplete
            suggestions={slashSuggestions}
            selectedIndex={slashPickIndex}
          />
        )}
        <PromptBar
          value={state.input}
          ghost={state.ghost}
          disabled={promptDisabled}
          inputKey={inputKey}
          slashActive={showSlashMenu}
          placeholder={
            canChat(state)
              ? undefined
              : "Type /profile new, /use <name>, or /project use <name>"
          }
          onChange={(v) => dispatch({ type: "set-input", value: v, ghost: state.ghost })}
          onSubmit={handleSubmit}
        />
      </box>
      {state.paletteOpen && (
        <CommandPalette
          filter={state.input}
          onSelect={(cmd) => {
            dispatch({ type: "set-palette", open: false });
            handleSubmit(cmd);
          }}
          onClose={() => dispatch({ type: "set-palette", open: false })}
        />
      )}
      {state.helpOpen && (
        <HelpOverlay hasProfile={canChat(state)} scopeKind={state.scopeKind} />
      )}
      {state.projectSetupOpen && (
        <ProjectSetupOverlay
          onComplete={(name, memberProfiles) => {
            chatHistoryRef.current = [];
            dispatch({ type: "clear" });
            dispatch({ type: "set-project", project: name, profiles: memberProfiles });
            dispatch({ type: "set-project-setup", open: false });
            dispatch({
              type: "add-block",
              block: {
                id: uid("ans"),
                kind: "answer",
                content: `Project **${name}** ready (${memberProfiles.join(", ")}). Ask cross-database questions — agent picks profile per query.`,
                streaming: false,
              },
            });
          }}
          onCancel={() => dispatch({ type: "set-project-setup", open: false })}
        />
      )}
      {state.profileSetupOpen && (
        <ProfileSetupOverlay
          onComplete={(name, database) => {
            chatHistoryRef.current = [];
            dispatch({ type: "clear" });
            dispatch({ type: "set-profile", profile: name, database });
            dispatch({ type: "set-profile-setup", open: false });
            dispatch({
              type: "add-block",
              block: {
                id: uid("ans"),
                kind: "answer",
                content: `Connected to **${name}**. New chat started — ask in plain English.`,
                streaming: false,
              },
            });
          }}
          onCancel={() => dispatch({ type: "set-profile-setup", open: false })}
        />
      )}
      {state.confirm && (
        <ConfirmOverlay
          request={state.confirm}
          onConfirm={(approved) => {
            confirmResolver.current?.(approved);
            confirmResolver.current = null;
            dispatch({ type: "set-confirm", confirm: null });
          }}
        />
      )}
    </box>
  );
}

export async function launchTui(): Promise<void> {
  const renderer = await createCliRenderer({ exitOnCtrlC: false });
  renderer.root.width = "100%";
  renderer.root.height = "100%";
  renderer.root.flexDirection = "column";
  createRoot(renderer).render(<App />);
}
