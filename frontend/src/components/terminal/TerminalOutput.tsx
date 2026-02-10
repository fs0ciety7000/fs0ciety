"use client";

import type { TerminalLine } from "@/types";
import { cn } from "@/lib/utils";

const LINE_STYLES: Record<string, string> = {
  input: "text-terminal-green-dim",
  output: "text-terminal-green",
  error: "text-terminal-red",
  system: "text-terminal-amber",
  ascii: "text-terminal-green brightness-125",
  image: "",
};

export function TerminalOutput({ lines }: { lines: TerminalLine[] }) {
  return (
    <div className="space-y-0.5">
      {lines.map((line) =>
        line.type === "image" ? (
          <div key={line.id} className="py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={line.content}
              alt=""
              className="h-24 w-auto"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(70%) sepia(50%) saturate(800%) hue-rotate(85deg) brightness(1.1)",
              }}
            />
          </div>
        ) : (
          <div
            key={line.id}
            className={cn(
              "font-mono text-sm leading-relaxed whitespace-pre-wrap break-all",
              LINE_STYLES[line.type]
            )}
          >
            {line.content}
          </div>
        )
      )}
    </div>
  );
}
