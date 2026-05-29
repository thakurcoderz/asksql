import { useCallback, useLayoutEffect, useRef } from "react";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useOnResize } from "@opentui/react";
import type { TranscriptBlock } from "../../shared/types.ts";
import { EmptyState } from "./EmptyState.tsx";
import {
  AnswerBlock,
  ErrorBlock,
  ExecutionBlock,
  MemoryBlock,
  SchemaBlock,
  ThinkingBlock,
  UserBlock,
} from "./ExecutionBlock.tsx";
import {
  collapsedExecutionIds,
  mergeTranscriptBlocks,
} from "../format/transcriptMerge.ts";

function scrollToBottom(sb: ScrollBoxRenderable): void {
  const max = Math.max(0, sb.scrollHeight - sb.viewport.height);
  sb.scrollTop = max;
}

export function Transcript(props: {
  blocks: TranscriptBlock[];
  database: string;
  onExample: (q: string) => void;
}) {
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  const bumpScrollBottom = useCallback(() => {
    if (props.blocks.length === 0) return;
    const sb = scrollRef.current;
    if (!sb) return;
    const apply = () => scrollToBottom(sb);
    apply();
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
  }, [props.blocks]);

  useLayoutEffect(() => {
    bumpScrollBottom();
  }, [bumpScrollBottom]);

  useOnResize(() => {
    bumpScrollBottom();
  });

  const scrollStyle = {
    width: "100%" as const,
    height: "100%" as const,
    flexGrow: 1,
    minHeight: 0,
  };

  if (props.blocks.length === 0) {
    return (
      <box style={{ ...scrollStyle, justifyContent: "center", alignItems: "center" }}>
        <EmptyState database={props.database} onSelect={props.onExample} />
      </box>
    );
  }

  const merged = mergeTranscriptBlocks(props.blocks);
  const collapsed = collapsedExecutionIds(merged);

  function afterResult(index: number): boolean {
    for (let i = index - 1; i >= 0; i--) {
      const b = merged[i]!;
      if (b.kind === "user") return false;
      if (b.kind === "execution" && b.result && b.result.rowcount > 0) return true;
    }
    return false;
  }

  return (
    <scrollbox
      ref={scrollRef}
      viewportCulling={false}
      style={scrollStyle}
    >
      <box style={{ flexDirection: "column", width: "100%", padding: 1 }}>
        {merged.map((block, index) => {
          switch (block.kind) {
            case "user":
              return <UserBlock key={block.id} text={block.text} />;
            case "thinking":
              return <ThinkingBlock key={block.id} />;
            case "schema":
              return <SchemaBlock key={block.id} tables={block.tables} />;
            case "execution":
              return (
                <ExecutionBlock
                  key={block.id}
                  tool={block.tool}
                  sql={block.sql}
                  result={block.result}
                  writeResult={block.writeResult}
                  error={block.error}
                  durationMs={block.durationMs}
                  mode={block.mode}
                  collapsed={collapsed.has(block.id)}
                />
              );
            case "memory":
              return <MemoryBlock key={block.id} section={block.section} />;
            case "answer":
              return (
                <AnswerBlock
                  key={block.id}
                  content={block.content}
                  streaming={block.streaming}
                  afterResult={afterResult(index)}
                />
              );
            case "error":
              return <ErrorBlock key={block.id} message={block.message} />;
            default:
              return null;
          }
        })}
      </box>
    </scrollbox>
  );
}
