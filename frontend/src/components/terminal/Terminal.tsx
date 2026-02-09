"use client";

import { useEffect, useRef } from "react";
import { useTerminal } from "@/hooks/useTerminal";
import { TerminalOutput } from "./TerminalOutput";
import { TerminalInput } from "./TerminalInput";

/** Full-screen terminal component. Auto-scrolls on new output. */
export function Terminal() {
  const { lines } = useTerminal();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="min-h-screen bg-terminal-black p-4 md:p-8 font-mono">
      {/* Terminal chrome bar */}
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-terminal-gray-light">
        <div className="w-3 h-3 rounded-full bg-terminal-red" />
        <div className="w-3 h-3 rounded-full bg-terminal-amber" />
        <div className="w-3 h-3 rounded-full bg-terminal-green" />
        <span className="ml-4 text-xs text-terminal-green-dim opacity-50">
          fs0ciety — bash — 80×24
        </span>
      </div>

      {/* Output area */}
      <div className="mb-4">
        <TerminalOutput lines={lines} />
      </div>

      {/* Input line */}
      <TerminalInput />

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
