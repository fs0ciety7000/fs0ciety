"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface MaskRevealProps {
  onComplete: () => void;
}

const GLITCH_LINES = [
  "ACCESSING MAINFRAME...",
  "DECRYPTING SIGNAL...",
  "IDENTITY: VERIFIED",
  "< we are fs0ciety >",
];

/**
 * MaskReveal — displays the fsociety mask with a cinematic
 * fade-in, glitch scanlines, and terminal text before dissolving.
 */
export function MaskReveal({ onComplete }: MaskRevealProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "text" | "exit">("enter");
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase 1: enter (fade in) — 800ms
    timers.push(setTimeout(() => setPhase("hold"), 800));

    // Phase 2: hold — show text lines sequentially
    timers.push(setTimeout(() => setPhase("text"), 1200));

    // Show text lines one by one
    GLITCH_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 1500 + i * 400));
    });

    // Phase 3: exit (fade out) — after all text shown
    timers.push(setTimeout(() => setPhase("exit"), 1500 + GLITCH_LINES.length * 400 + 600));

    // Complete — hand off to terminal
    timers.push(setTimeout(onComplete, 1500 + GLITCH_LINES.length * 400 + 1400));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-terminal-black flex flex-col items-center justify-center font-mono relative overflow-hidden">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)",
        }}
      />

      {/* Mask image */}
      <AnimatePresence>
        {phase !== "exit" && (
          <motion.div
            className="relative z-20"
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{
              opacity: phase === "enter" ? [0, 0.6, 1] : 1,
              scale: 1,
              filter: "blur(0px)",
            }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
            transition={{
              duration: phase === "enter" ? 0.8 : 0.6,
              ease: "easeOut",
            }}
          >
            {/* Green glow behind mask */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(0,255,65,0.15) 0%, transparent 70%)",
                transform: "scale(1.5)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mask.png"
              alt=""
              className="w-48 h-48 md:w-64 md:h-64 relative"
              style={{
                filter: "brightness(0) saturate(100%) invert(72%) sepia(98%) saturate(1200%) hue-rotate(85deg) brightness(104%) contrast(106%)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glitch text lines */}
      <div className="mt-8 z-20 text-center space-y-2 min-h-[120px]">
        {GLITCH_LINES.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-sm tracking-widest ${
              i === GLITCH_LINES.length - 1
                ? "text-terminal-green font-bold text-base mt-4"
                : "text-terminal-green-dim"
            }`}
          >
            {line}
          </motion.div>
        ))}
      </div>

      {/* Flicker effect */}
      <motion.div
        className="absolute inset-0 bg-terminal-green z-30 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.05, 0, 0.03, 0, 0.02, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
