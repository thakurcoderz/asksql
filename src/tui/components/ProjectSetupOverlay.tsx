import { useEffect, useState } from "react";
import { theme } from "../theme.ts";
import { createProject, projectExists } from "../../core/projects/index.ts";
import { listProfiles } from "../../core/profiles/index.ts";

export function ProjectSetupOverlay(props: {
  onComplete: (projectName: string, memberProfiles: string[]) => void;
  onCancel: () => void;
}) {
  const profiles = listProfiles();
  const [step, setStep] = useState<"name" | "pick">("name");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [pickInput, setPickInput] = useState("");
  const [inputKey, setInputKey] = useState(0);

  useEffect(() => {
    setNameInput("");
    setPickInput("");
    setInputKey((k) => k + 1);
  }, [step]);

  function submitName(raw: string) {
    const value = raw.trim();
    if (!value) {
      setError("Project name is required.");
      return;
    }
    if (projectExists(value)) {
      setError(`Project '${value}' already exists.`);
      return;
    }
    setName(value);
    setError("");
    setStep("pick");
    if (profiles.length === 1) setSelected([profiles[0]!]);
  }

  function toggleProfile(p: string) {
    setSelected((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function save() {
    if (selected.length === 0) {
      setError("Select at least one profile.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createProject(name, selected);
      props.onComplete(name, selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function handlePickInput(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (value === "save" || value === "done") {
      void save();
      return;
    }
    const match = profiles.find((p) => p.toLowerCase() === value.toLowerCase());
    if (match) toggleProfile(match);
    setPickInput("");
  }

  return (
    <box
      style={{
        position: "absolute",
        left: 2,
        right: 2,
        top: "15%",
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
        <b>New project</b>
      </text>
      {step === "name" ? (
        <>
          <text fg={theme.fgDim}>Step 1/2 · project name</text>
          <box style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
            <text fg={theme.fg}>Name: </text>
            <box style={{ flexGrow: 1 }}>
              <input
                key={inputKey}
                value={nameInput}
                focused={!busy}
                placeholder="e.g. trualta"
                onInput={setNameInput}
                onSubmit={(v) => submitName(typeof v === "string" ? v : nameInput)}
                style={{ width: "100%" }}
              />
            </box>
          </box>
        </>
      ) : (
        <>
          <text fg={theme.fgDim}>
            Step 2/2 · type profile name to toggle, then type save
          </text>
          <text fg={theme.fgMuted}>Project: {name}</text>
          {profiles.length === 0 ? (
            <text fg={theme.warn}>No profiles yet. Run /profile new first.</text>
          ) : (
            profiles.map((p) => (
              <text key={p} fg={selected.includes(p) ? theme.accent : theme.fgMuted}>
                {selected.includes(p) ? "[x]" : "[ ]"} {p}
              </text>
            ))
          )}
          <input
            key={inputKey + 1}
            value={pickInput}
            focused={!busy}
            placeholder="profile name or save"
            onInput={setPickInput}
            onSubmit={(v) => handlePickInput(typeof v === "string" ? v : pickInput)}
            style={{ width: "100%" }}
          />
        </>
      )}
      {error && <text fg={theme.errorAccent}>{error}</text>}
      <text fg={theme.fgDim}>esc cancel</text>
    </box>
  );
}
