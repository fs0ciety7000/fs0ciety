"use client";

import { motion, useAnimationControls } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface GlitchTextProps {
  text: string;
  /** CSS class for the wrapper. */
  className?: string;
  /** Intensity: 1 = subtle, 2 = moderate, 3 = heavy. Default: 2. */
  intensity?: 1 | 2 | 3;
  /** Enable continuous glitching. Default: true. */
  continuous?: boolean;
  /** Glitch on hover only. Default: false. */
  hoverOnly?: boolean;
  /** Color of the primary text. Default: terminal green. */
  color?: string;
}

const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`01";

/** Randomize characters in a string for glitch effect. */
function scramble(text: string, factor: number): string {
  return text
    .split("")
    .map((char) => {
      if (char === " ") return " ";
      if (Math.random() < factor) {
        return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      return char;
    })
    .join("");
}

/**
 * GlitchText — a text component with layered RGB-split glitch effects
 * driven by Framer Motion. Inspired by Mr. Robot title sequences.
 *
 * Three visual layers:
 * 1. Base text (green)
 * 2. Cyan offset clone (clip-path top third)
 * 3. Red offset clone (clip-path bottom third)
 *
 * The scramble effect randomly replaces characters on a timer.
 */
export function GlitchText({
  text,
  className,
  intensity = 2,
  continuous = true,
  hoverOnly = false,
  color = "#00FF41",
}: GlitchTextProps) {
  const [display, setDisplay] = useState(text);
  const [isGlitching, setIsGlitching] = useState(!hoverOnly && continuous);
  const controls = useAnimationControls();

  const scrambleFactor = intensity * 0.12;
  const offsetPx = intensity * 2;

  // Periodic character scramble.
  useEffect(() => {
    if (!isGlitching) {
      setDisplay(text);
      return;
    }

    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        setDisplay(scramble(text, scrambleFactor));
        // Snap back after short delay.
        setTimeout(() => setDisplay(text), 50 + Math.random() * 100);
      }
    }, 100 + Math.random() * 200);

    return () => clearInterval(interval);
  }, [text, isGlitching, scrambleFactor]);

  // Periodic position glitch via Framer Motion.
  useEffect(() => {
    if (!isGlitching) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.25) {
        controls.start({
          x: [0, -offsetPx, offsetPx, -offsetPx / 2, 0],
          transition: { duration: 0.15, ease: "easeInOut" },
        });
      }
    }, 800 + Math.random() * 1200);

    return () => clearInterval(interval);
  }, [isGlitching, controls, offsetPx]);

  const handleHoverStart = useCallback(() => {
    if (hoverOnly) setIsGlitching(true);
  }, [hoverOnly]);

  const handleHoverEnd = useCallback(() => {
    if (hoverOnly) {
      setIsGlitching(false);
      setDisplay(text);
    }
  }, [hoverOnly, text]);

  return (
    <motion.span
      className={cn("relative inline-block font-mono font-bold", className)}
      animate={controls}
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
    >
      {/* Base text */}
      <span style={{ color }}>{display}</span>

      {/* Cyan clone — top slice */}
      <span
        aria-hidden
        className="absolute inset-0 glitch-clip-1 opacity-80"
        style={{
          color: "#00D4FF",
          transform: `translate(${isGlitching ? offsetPx : 0}px, ${isGlitching ? -1 : 0}px)`,
          transition: "transform 0.05s",
        }}
      >
        {display}
      </span>

      {/* Red clone — bottom slice */}
      <span
        aria-hidden
        className="absolute inset-0 glitch-clip-3 opacity-80"
        style={{
          color: "#FF0033",
          transform: `translate(${isGlitching ? -offsetPx : 0}px, ${isGlitching ? 1 : 0}px)`,
          transition: "transform 0.05s",
        }}
      >
        {display}
      </span>
    </motion.span>
  );
}
