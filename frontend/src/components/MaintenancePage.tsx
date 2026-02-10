"use client";

import { useEffect, useState, useRef } from "react";

const GLITCH_CHARS = "!@#$%^&*_+-=|;:<>?~01";

/**
 * Maintenance page — Mr. Robot / fsociety style.
 *
 * Full CRT aesthetic: glitching title, fake kernel panic,
 * scrolling hex dump, and a "we are fsociety" vibe.
 */
export function MaintenancePage() {
  const [titleText, setTitleText] = useState("SYSTEM OFFLINE");
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [hexDump, setHexDump] = useState<string[]>([]);
  const hexRef = useRef<HTMLDivElement>(null);

  // Glitch the title
  useEffect(() => {
    const target = "SYSTEM OFFLINE";
    const interval = setInterval(() => {
      setTitleText(
        target
          .split("")
          .map((ch) =>
            ch === " "
              ? " "
              : Math.random() > 0.75
              ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
              : ch
          )
          .join("")
      );
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Simulated kernel panic / boot sequence
  useEffect(() => {
    const lines = [
      "[ 0.000000] Linux 5.15.0-fsociety #1 SMP PREEMPT",
      "[ 0.000000] Command line: BOOT_IMAGE=/vmlinuz root=/dev/sda1",
      "[ 0.031337] Initializing cgroup subsys cpuset",
      "[ 0.031337] Initializing cgroup subsys cpu",
      "[ 0.041592] Security Framework initialized",
      "[ 0.065536] SELinux: disabled at boot (fsociety override)",
      "[ 0.131072] ACPI: Core revision 20210730",
      "[ 0.262144] ...",
      "[ 1.000000] ████████████████████████████████████████",
      "[ 1.000000]",
      "[ 1.048576] Kernel panic - not syncing: VFS: Unable to mount root fs",
      "[ 1.048576] Pid: 1, comm: swapper Not tainted 5.15.0-fsociety",
      "[ 1.048576] Call Trace:",
      "[ 1.048576]  <TASK>",
      "[ 1.048576]  dump_stack_lvl+0x34/0x44",
      "[ 1.048576]  panic+0x10e/0x2c8",
      "[ 1.048576]  mount_block_root+0x1c2/0x254",
      "[ 1.048576]  mount_root+0xed/0x10f",
      "[ 1.048576]  prepare_namespace+0x136/0x165",
      "[ 1.048576]  kernel_init+0x16/0x120",
      "[ 1.048576]  ret_from_fork+0x22/0x30",
      "[ 1.048576]  </TASK>",
      "[ 1.048576]",
      "[ 1.048576] ---[ end Kernel panic - not syncing ]---",
      "",
      "  We are fsociety.",
      "  We are finally free.",
      "  We are coming back.",
      "",
      "  [MAINTENANCE MODE ACTIVE]",
      "  The system is undergoing scheduled maintenance.",
      "  Normal operations will resume shortly.",
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(timer);
        return;
      }
      const line = lines[i];
      i++;
      setBootLines((prev) => [...prev, line]);
    }, 90);
    return () => clearInterval(timer);
  }, []);

  // Scrolling hex dump in the background
  useEffect(() => {
    function randomHexLine(): string {
      const addr = Math.floor(Math.random() * 0xffffffff)
        .toString(16)
        .padStart(8, "0");
      const bytes = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0")
      ).join(" ");
      const ascii = Array.from({ length: 16 }, () => {
        const c = 33 + Math.floor(Math.random() * 93);
        return String.fromCharCode(c);
      }).join("");
      return `0x${addr}  ${bytes}  |${ascii}|`;
    }

    const interval = setInterval(() => {
      setHexDump((prev) => {
        const next = [...prev, randomHexLine()];
        return next.length > 50 ? next.slice(-50) : next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll hex dump
  useEffect(() => {
    if (hexRef.current) {
      hexRef.current.scrollTop = hexRef.current.scrollHeight;
    }
  }, [hexDump]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden select-none">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)",
        }}
      />

      {/* CRT vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* Hex dump background — faint, scrolling */}
      <div
        ref={hexRef}
        className="fixed inset-0 z-0 overflow-hidden opacity-[0.04] font-mono text-[10px] text-green-500 leading-tight p-4 whitespace-pre"
      >
        {hexDump.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        {/* fsociety mask — ASCII art */}
        <pre className="text-red-500 text-[8px] sm:text-[10px] leading-none mb-8 opacity-60 font-mono">
{`        ██████████
      ██          ██
    ██   ██    ██   ██
   ██    ██    ██    ██
   ██                ██
   ██   ██      ██   ██
    ██   ████████   ██
      ██          ██
        ██████████`}
        </pre>

        {/* Glitching title */}
        <h1
          className="text-4xl sm:text-6xl md:text-7xl font-mono font-black text-red-500 tracking-widest mb-4"
          style={{
            textShadow:
              "2px 0 #00FF41, -2px 0 #00D4FF, 0 0 15px rgba(255,0,0,0.4)",
          }}
        >
          {titleText}
        </h1>

        {/* Subtitle */}
        <div className="text-green-500 font-mono text-sm sm:text-base tracking-[0.3em] uppercase mb-12 opacity-60">
          {"// maintenance protocol engaged"}
        </div>

        {/* Terminal output — kernel panic */}
        <div className="w-full max-w-2xl border border-green-900/40 bg-black/80 p-4 font-mono text-[11px] sm:text-xs max-h-[50vh] overflow-y-auto">
          {bootLines.map((line, i) => {
            const l = line ?? "";
            return (
              <div
                key={i}
                className={
                  l.includes("panic") || l.includes("end Kernel")
                    ? "text-red-500 font-bold"
                    : l.includes("█")
                    ? "text-red-600"
                    : l.startsWith("  We are")
                    ? "text-green-400 font-bold"
                    : l.includes("[MAINTENANCE")
                    ? "text-amber-400 font-bold"
                    : l.startsWith("  The system") || l.startsWith("  Normal")
                    ? "text-gray-400"
                    : l.includes("SELinux") || l.includes("fsociety")
                    ? "text-cyan-400"
                    : l.includes("Call Trace") ||
                      l.includes("<TASK>") ||
                      l.includes("</TASK>")
                    ? "text-red-400"
                    : l.includes("+0x")
                    ? "text-red-400/70"
                    : "text-green-600"
                }
              >
                {l || "\u00A0"}
              </div>
            );
          })}
          <span className="text-green-500 animate-pulse">_</span>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 text-center font-mono space-y-2">
          <div className="text-[10px] text-green-700">
            {"─".repeat(40)}
          </div>
          <div className="text-xs text-green-600 opacity-50">
            node fs0ciety-prod-01 | pid 1337 | uptime 0d 0h 0m
          </div>
          <div className="text-[10px] text-green-800">
            0xDEAD 0xBEEF 0xCAFE 0xBABE
          </div>
        </div>
      </div>
    </div>
  );
}
