"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useTerminal } from "@/hooks/useTerminal";

export function TerminalInput() {
  const { prompt, exec, historyUp, historyDown } = useTerminal();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      exec(value);
      setValue("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = historyUp();
      if (prev !== null) setValue(prev);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = historyDown();
      setValue(next ?? "");
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      exec("clear");
      setValue("");
    }
  }

  return (
    <div
      className="flex items-center gap-2 font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      <span className="text-terminal-green-dim shrink-0">{prompt}</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        className="flex-1 bg-transparent text-terminal-green outline-none caret-terminal-green"
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
      />
    </div>
  );
}
