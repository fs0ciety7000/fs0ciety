"use client";

import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { TerminalContext, TerminalLine } from "@/types";
import { executeCommand } from "@/lib/commands";
import { uid } from "@/lib/utils";

interface TerminalState {
  lines: TerminalLine[];
  history: string[];
  historyIndex: number;
  prompt: string;
  currentPath: string;
}

interface TerminalProviderValue extends TerminalState {
  /** Execute a command string and append output. */
  exec: (input: string) => void;
  /** Add lines directly (for boot sequence, etc.). */
  addLines: (lines: TerminalLine[]) => void;
  /** Clear all output. */
  clearLines: () => void;
  /** Set the prompt prefix. */
  setPrompt: (prompt: string) => void;
  /** Navigate command history up. Returns the command string or null. */
  historyUp: () => string | null;
  /** Navigate command history down. Returns the command string or null. */
  historyDown: () => string | null;
}

export const TerminalCtx = createContext<TerminalProviderValue | null>(null);

const INITIAL_LINES: TerminalLine[] = [
  {
    id: uid(),
    type: "ascii",
    content: " ███████╗███████╗ ██████╗  ██████╗██╗███████╗████████╗██╗   ██╗",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "ascii",
    content: " ██╔════╝██╔════╝██╔═══██╗██╔════╝██║██╔════╝╚══██╔══╝╚██╗ ██╔╝",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "ascii",
    content: " █████╗  ███████╗██║   ██║██║     ██║█████╗     ██║    ╚████╔╝ ",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "ascii",
    content: " ██╔══╝  ╚════██║██║   ██║██║     ██║██╔══╝     ██║     ╚██╔╝  ",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "ascii",
    content: " ██║     ███████║╚██████╔╝╚██████╗██║███████╗   ██║      ██║   ",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "ascii",
    content: " ╚═╝     ╚══════╝ ╚═════╝  ╚═════╝╚═╝╚══════╝   ╚═╝      ╚═╝   ",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "system",
    content: "",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "system",
    content: '  "Control is an illusion."',
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "system",
    content: "",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "system",
    content: "  Type 'help' to see available commands.",
    timestamp: Date.now(),
  },
  {
    id: uid(),
    type: "system",
    content: "",
    timestamp: Date.now(),
  },
];

export function TerminalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [state, setState] = useState<TerminalState>({
    lines: INITIAL_LINES,
    history: [],
    historyIndex: -1,
    prompt: "guest@fs0ciety:~$",
    currentPath: "/",
  });

  const navigate = useCallback(
    (path: string) => router.push(path),
    [router]
  );

  const addLines = useCallback((newLines: TerminalLine[]) => {
    setState((s) => ({ ...s, lines: [...s.lines, ...newLines] }));
  }, []);

  const clearLines = useCallback(() => {
    setState((s) => ({ ...s, lines: [] }));
  }, []);

  const setPrompt = useCallback((prompt: string) => {
    setState((s) => ({ ...s, prompt }));
  }, []);

  const exec = useCallback(
    (input: string) => {
      const inputLine: TerminalLine = {
        id: uid(),
        type: "input",
        content: `${state.prompt} ${input}`,
        timestamp: Date.now(),
      };

      const ctx: TerminalContext = {
        addLines,
        clearLines,
        setPrompt,
        navigate,
        currentPath: state.currentPath,
      };

      const output = executeCommand(input, ctx);

      setState((s) => ({
        ...s,
        lines: [...s.lines, inputLine, ...output],
        history: input.trim() ? [input, ...s.history] : s.history,
        historyIndex: -1,
      }));
    },
    [state.prompt, state.currentPath, addLines, clearLines, setPrompt, navigate]
  );

  const historyUp = useCallback((): string | null => {
    let result: string | null = null;
    setState((s) => {
      const next = Math.min(s.historyIndex + 1, s.history.length - 1);
      result = s.history[next] ?? null;
      return { ...s, historyIndex: next };
    });
    return result;
  }, []);

  const historyDown = useCallback((): string | null => {
    let result: string | null = null;
    setState((s) => {
      const next = Math.max(s.historyIndex - 1, -1);
      result = next >= 0 ? s.history[next] ?? null : null;
      return { ...s, historyIndex: next };
    });
    return result;
  }, []);

  const value = useMemo<TerminalProviderValue>(
    () => ({
      ...state,
      exec,
      addLines,
      clearLines,
      setPrompt,
      historyUp,
      historyDown,
    }),
    [state, exec, addLines, clearLines, setPrompt, historyUp, historyDown]
  );

  return (
    <TerminalCtx.Provider value={value}>{children}</TerminalCtx.Provider>
  );
}
