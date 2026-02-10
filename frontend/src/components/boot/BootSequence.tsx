"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface BootLine {
  text: string;
  status: "ok" | "warn" | "fail" | "info";
  delay: number;
}

const HACKER_QUOTES = [
  "\"Control is an illusion.\" — Mr. Robot",
  "\"Is any of it real? A world built on fantasy.\" — Elliot",
  "\"People always make the best exploits.\" — Kevin Mitnick",
  "\"The quieter you become, the more you can hear.\" — Kali Linux",
  "\"There is no cloud, it's just someone else's computer.\"",
  "\"We are fsociety. We are finally free.\"",
  "\"chmod 777 your mind.\"",
  "\"Privacy is not for sale.\"",
  "\"rm -rf /society\"",
  "\"In a world of locked rooms, the man with the key is king.\"",
  "\"Hacking is not a crime, it's a survival skill.\"",
  "\"The best way to predict the future is to create it.\"",
];

const BOOT_SEQUENCE: BootLine[] = [
  { text: "BIOS POST... Memory check: 32768 MB OK", status: "ok", delay: 200 },
  { text: "Loading kernel: fs0ciety v0.1.0-axum", status: "info", delay: 300 },
  { text: "Initializing network interfaces...", status: "ok", delay: 250 },
  { text: "Mounting /dev/sda1 on /media/storage... 4TB", status: "ok", delay: 400 },
  { text: "Starting SurrealDB service...", status: "ok", delay: 350 },
  { text: "Connecting to backend API (Axum)...", status: "ok", delay: 200 },
  { text: "Checking Plex Media Server...", status: "ok", delay: 300 },
  { text: "Checking Sonarr...", status: "ok", delay: 250 },
  { text: "Checking Radarr...", status: "ok", delay: 200 },
  { text: "Checking qBittorrent daemon...", status: "ok", delay: 300 },
  { text: "Loading terminal interface...", status: "ok", delay: 200 },
  { text: "All systems operational. Welcome back.", status: "info", delay: 400 },
  { text: HACKER_QUOTES[Math.floor(Math.random() * HACKER_QUOTES.length)], status: "info", delay: 600 },
];

const STATUS_COLORS = {
  ok: "text-terminal-green",
  warn: "text-terminal-amber",
  fail: "text-terminal-red",
  info: "text-terminal-cyan",
};

const STATUS_LABELS = {
  ok: "[ OK ]",
  warn: "[WARN]",
  fail: "[FAIL]",
  info: "[INFO]",
};

interface BootSequenceProps {
  onComplete: () => void;
}

/**
 * BootSequence — simulates a Linux-style boot sequence.
 * Displays service checks before handing off to the terminal.
 */
export function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let current = 0;

    function showNext() {
      if (current >= BOOT_SEQUENCE.length) {
        // Give user a moment to read the final line.
        timeout = setTimeout(onComplete, 800);
        return;
      }

      timeout = setTimeout(() => {
        current++;
        setVisibleLines(current);
        showNext();
      }, BOOT_SEQUENCE[current].delay);
    }

    showNext();
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-terminal-black p-6 font-mono text-sm">
      <div className="mb-4 text-terminal-green-dim opacity-50">
        fs0ciety BIOS v2.049 — Backd00r
      </div>

      {BOOT_SEQUENCE.slice(0, visibleLines).map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.1 }}
          className="flex items-center gap-3 py-0.5"
        >
          <span className={STATUS_COLORS[line.status]}>
            {STATUS_LABELS[line.status]}
          </span>
          <span className="text-terminal-green">{line.text}</span>
        </motion.div>
      ))}

      {visibleLines < BOOT_SEQUENCE.length && (
        <span className="terminal-cursor inline-block mt-2" />
      )}
    </div>
  );
}
