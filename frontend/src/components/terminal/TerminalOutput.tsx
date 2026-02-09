"use client";

import type { TerminalLine } from "@/types";
import { cn } from "@/lib/utils";

const LINE_STYLES: Record<TerminalLine["type"], string> = {
  input: "text-terminal-green-dim",
  output: "text-terminal-green",
  error: "text-terminal-red",
  system: "text-terminal-amber",
  ascii: "text-terminal-green brightness-125",
};

export function TerminalOutput({ lines }: { lines: TerminalLine[] }) {
  return (
    <div className="space-y-0.5">
      {lines.map((line) => (
        <div
          key={line.id}
          className={cn(
            "font-mono text-sm leading-relaxed whitespace-pre-wrap break-all",
            LINE_STYLES[line.type]
          )}
        >
          {line.content}
        </div>
      ))}
    </div>
  );
}
