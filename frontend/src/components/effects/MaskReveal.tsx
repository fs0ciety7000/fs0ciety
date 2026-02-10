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
 * MaskReveal — displays the fsociety GIF with green tint,
 * CRT scanlines, glitch text, then dissolves into the terminal.
 */
export function MaskReveal({ onComplete }: MaskRevealProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "text" | "exit">("enter");
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setPhase("hold"), 800));
    timers.push(setTimeout(() => setPhase("text"), 1200));

    GLITCH_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 1500 + i * 400));
    });

    timers.push(setTimeout(() => setPhase("exit"), 1500 + GLITCH_LINES.length * 400 + 600));
    timers.push(setTimeout(onComplete, 1500 + GLITCH_LINES.length * 400 + 1400));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-terminal-black flex flex-col items-center justify-center font-mono relative overflow-hidden">
      {/* CRT scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-30"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.04) 2px, rgba(0,255,65,0.04) 4px)",
        }}
      />

      {/* Green tint overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,255,65,0.08) 0%, rgba(0,20,5,0.6) 100%)",
          mixBlendMode: "screen",
        }}
      />

      {/* GIF animation */}
      <AnimatePresence>
        {phase !== "exit" && (
          <motion.div
            className="relative z-10 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
            animate={{
              opacity: phase === "enter" ? [0, 0.7, 1] : 1,
              scale: 1,
              filter: "blur(0px)",
            }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{
              duration: phase === "enter" ? 0.8 : 0.6,
              ease: "easeOut",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fsociety-reveal.gif"
              alt=""
              className="w-[320px] h-[240px] md:w-[480px] md:h-[360px] object-contain"
              style={{
                filter:
                  "brightness(0.7) saturate(0.3) sepia(1) hue-rotate(85deg) saturate(3) brightness(0.9) contrast(1.2)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glitch text lines */}
      <div className="mt-8 z-40 text-center space-y-2 min-h-[120px]">
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
        className="absolute inset-0 bg-terminal-green z-50 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.04, 0, 0.02, 0, 0.03, 0],
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
