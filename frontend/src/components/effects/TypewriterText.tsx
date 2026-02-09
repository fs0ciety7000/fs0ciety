"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  text: string;
  className?: string;
  /** Delay between each character in seconds. Default: 0.04. */
  charDelay?: number;
  /** Initial delay before typing starts. Default: 0. */
  startDelay?: number;
  /** Show blinking cursor at end. Default: true. */
  cursor?: boolean;
}

/**
 * TypewriterText — reveals text character by character.
 * Each character fades in with a stagger using Framer Motion.
 */
export function TypewriterText({
  text,
  className,
  charDelay = 0.04,
  startDelay = 0,
  cursor = true,
}: TypewriterTextProps) {
  const chars = text.split("");

  return (
    <span className={cn("font-mono inline-flex flex-wrap", className)}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: startDelay + i * charDelay,
            duration: 0.01,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
      {cursor && (
        <motion.span
          className="terminal-cursor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: startDelay + chars.length * charDelay }}
        />
      )}
    </span>
  );
}
