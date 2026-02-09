"use client";

import { useContext } from "react";
import { TerminalCtx } from "@/providers/TerminalProvider";

/** Access the terminal state and actions. Throws if used outside TerminalProvider. */
export function useTerminal() {
  const ctx = useContext(TerminalCtx);
  if (!ctx) {
    throw new Error("useTerminal must be used within a <TerminalProvider>");
  }
  return ctx;
}
