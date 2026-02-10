"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MESSAGE = "NODE COMPROMISED";

export default function NotFound() {
  const [glitchText, setGlitchText] = useState(MESSAGE);
  const [logLines, setLogLines] = useState<string[]>([]);

  // Glitch the title text continuously
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchText(
        MESSAGE.split("")
          .map((ch) =>
            Math.random() > 0.7
              ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
              : ch
          )
          .join("")
      );
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Simulate terminal log lines appearing
  useEffect(() => {
    const lines = [
      "$ curl -s http://target/404",
      "HTTP/1.1 404 Not Found",
      "Connection: keep-alive",
      "X-Powered-By: fs0ciety/1.0",
      "",
      "[WARN] Requested node not found in cluster",
      "[ERR]  Path traversal attempt blocked",
      "[INFO] Logging connection to /var/log/intrusion.log",
      "[ERR]  Resource does not exist on this node",
      "",
      "$ echo $?",
      "1",
    ];
    let i = 0;
    const timer = setInterval(() => {
      if (i < lines.length) {
        setLogLines((prev) => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 150);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-terminal-black flex items-center justify-center p-8">
      <div className="noise-overlay" aria-hidden="true" />
      <div className="max-w-2xl w-full text-center">
        {/* 404 number with massive glitch */}
        <div className="relative mb-6">
          <h1
            className="text-8xl sm:text-9xl font-mono font-black text-terminal-red select-none"
            style={{
              textShadow: "3px 0 #00FF41, -3px 0 #00D4FF, 0 0 20px rgba(255,0,51,0.5)",
              animation: "glitch-shake 0.15s ease-in-out infinite",
            }}
          >
            404
          </h1>
        </div>

        {/* Glitching message */}
        <div className="text-xl sm:text-2xl font-mono font-bold text-terminal-red mb-8 tracking-widest uppercase">
          {glitchText}
        </div>

        {/* Separator */}
        <div className="text-terminal-gray-light font-mono text-sm mb-8">
          {"─".repeat(40)}
        </div>

        {/* Fake terminal log */}
        <div className="text-left border border-terminal-gray-light bg-terminal-black-light p-4 mb-8 font-mono text-xs max-h-64 overflow-y-auto">
          {logLines.map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith("[ERR]")
                  ? "text-terminal-red"
                  : line.startsWith("[WARN]")
                  ? "text-terminal-amber"
                  : line.startsWith("[INFO]")
                  ? "text-terminal-cobalt"
                  : line.startsWith("$")
                  ? "text-terminal-green"
                  : "text-terminal-green-dim/60"
              }
            >
              {line || "\u00A0"}
            </div>
          ))}
          <span className="text-terminal-green animate-blink">_</span>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-6 font-mono text-sm">
          <Link
            href="/blog"
            className="text-terminal-cyan hover:text-terminal-green transition-colors"
          >
            $ cd /blog
          </Link>
          <Link
            href="/"
            className="text-terminal-cyan hover:text-terminal-green transition-colors"
          >
            $ cd /
          </Link>
        </div>

        {/* Memory address joke */}
        <div className="mt-8 text-[10px] font-mono text-terminal-green-dim/30">
          segfault at 0x00000404 rip 0xdeadbeef rsp 0xcafebabe
        </div>
      </div>
    </div>
  );
}
