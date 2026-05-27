import { useRef, useState } from "react";
import type { DbConfig } from "../../shared/types.ts";
import { testConnection } from "../../core/mysql.ts";
import { createProfile, profileExists } from "../../core/profiles/index.ts";
import { theme } from "../theme.ts";

const FIELDS = ["host", "port", "database", "username", "password"] as const;
type Field = (typeof FIELDS)[number];

function label(field: Field): string {
  switch (field) {
    case "host":
      return "DB_HOST";
    case "port":
      return "DB_PORT";
    case "database":
      return "DB_DATABASE";
    case "username":
      return "DB_USERNAME";
    case "password":
      return "DB_PASSWORD";
  }
}

export function ProfileSetupOverlay(props: {
  onComplete: (profileName: string, database: string) => void;
  onCancel: () => void;
}) {
  const [config, setConfig] = useState<DbConfig>({
    host: "127.0.0.1",
    port: 3306,
    database: "",
    username: "root",
    password: "",
  });
  const [step, setStep] = useState(0);
  const [overwrite, setOverwrite] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef("");

  const field = FIELDS[step];

  async function save(next: DbConfig, allowOverwrite: boolean) {
    setBusy(true);
    setError("");
    try {
      await testConnection(next);
      await createProfile(next, allowOverwrite);
      props.onComplete(next.database, next.database);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function submit(raw: string) {
    const value = raw.trim();
    setError("");

    if (overwrite) {
      if (value.toLowerCase() === "y") await save(config, true);
      else props.onCancel();
      return;
    }

    if (!field) return;

    if (field === "host") {
      setConfig((c) => ({ ...c, host: value || c.host }));
    } else if (field === "port") {
      setConfig((c) => ({ ...c, port: value ? Number(value) : c.port }));
    } else if (field === "database") {
      if (!value) {
        setError("Database name is required.");
        return;
      }
      setConfig((c) => ({ ...c, database: value }));
    } else if (field === "username") {
      setConfig((c) => ({ ...c, username: value || c.username }));
    } else if (field === "password") {
      const next = { ...config, password: value };
      setConfig(next);
      if (profileExists(next.database)) {
        setOverwrite(true);
        inputRef.current = "";
        return;
      }
      await save(next, false);
      return;
    }

    setStep((s) => s + 1);
    inputRef.current = "";
  }

  return (
    <box
      style={{
        position: "absolute",
        left: 2,
        right: 2,
        top: "20%",
        border: true,
        borderStyle: "rounded",
        borderColor: theme.accent,
        backgroundColor: theme.bgElevated,
        padding: 1,
        flexDirection: "column",
        gap: 1,
      }}
    >
      <text fg={theme.accent}>
        <b>New database profile</b>
      </text>
      {overwrite ? (
        <>
          <text fg={theme.warn}>
            Profile '{config.database}' exists. Type y to overwrite, anything else to cancel.
          </text>
          <input
            focused={!busy}
            onInput={(v) => {
              inputRef.current = v;
            }}
            onSubmit={() => submit(inputRef.current)}
            style={{ width: "100%" }}
          />
        </>
      ) : (
        <>
          <text fg={theme.fgDim}>
            Step {step + 1}/{FIELDS.length} · {label(field!)}
          </text>
          <text fg={theme.fgMuted}>
            {config.host}:{config.port} · {config.database || "…"} · {config.username}
          </text>
          <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
            <text fg={theme.fg}>{label(field!)}: </text>
            <box style={{ flexGrow: 1 }}>
              <input
                focused={!busy}
                placeholder={
                  field === "host"
                    ? config.host
                    : field === "port"
                      ? String(config.port)
                      : field === "username"
                        ? config.username
                        : field === "database"
                          ? "required"
                          : ""
                }
                onInput={(v) => {
                  inputRef.current = v;
                }}
                onSubmit={() => submit(inputRef.current)}
                style={{ width: "100%" }}
              />
            </box>
          </box>
        </>
      )}
      {error && <text fg={theme.errorAccent}>{error}</text>}
      <text fg={theme.fgDim}>enter next · esc cancel</text>
    </box>
  );
}
