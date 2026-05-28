import type { SafetyMode, AgentScope } from "../shared/types.ts";
import { runAgentTurn } from "../core/agent/index.ts";

export async function runAsk(opts: {
  scope: AgentScope;
  question: string;
  mode: SafetyMode;
  model: string;
}): Promise<void> {
  let streaming = false;

  await runAgentTurn(
    {
      scope: opts.scope,
      mode: opts.mode,
      model: opts.model,
      onEvent: (event) => {
        if (event.type === "answer-chunk") {
          if (!streaming) streaming = true;
          process.stdout.write(event.content);
        }
        if (event.type === "error") {
          console.error("\n" + event.message);
        }
      },
    },
    opts.question,
  );

  if (streaming) process.stdout.write("\n");
}
