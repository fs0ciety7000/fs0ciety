"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GlitchText } from "@/components/effects/GlitchText";
import { TypewriterText } from "@/components/effects/TypewriterText";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "auth" | "granted" | "denied">(
    "idle"
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("auth");

    // Simulate SSH handshake delay.
    await new Promise((r) => setTimeout(r, 1500));

    try {
      const res = await api.login(username, password);
      localStorage.setItem("fs0ciety_token", res.token);
      localStorage.setItem("fs0ciety_user", JSON.stringify(res.user));
      setStatus("granted");
      setTimeout(() => router.push("/admin"), 1000);
    } catch {
      setStatus("denied");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-terminal-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg border border-terminal-green/30 bg-terminal-black-light p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <GlitchText
            text="SSH LOGIN"
            className="text-3xl mb-2"
            intensity={1}
            hoverOnly
          />
          <div className="text-terminal-green-dim text-xs opacity-50">
            fs0ciety secure shell — v0.1.0
          </div>
        </div>

        {/* Connection banner */}
        <div className="mb-6 text-xs font-mono text-terminal-amber space-y-1">
          <div>Last login: Thu Feb 06 03:14:07 2026 from 10.0.0.1</div>
          <div className="text-terminal-green-dim">
            ╔══════════════════════════════════════════╗
          </div>
          <div className="text-terminal-green-dim">
            ║  WARNING: Unauthorized access prohibited ║
          </div>
          <div className="text-terminal-green-dim">
            ║  All sessions are monitored and logged   ║
          </div>
          <div className="text-terminal-green-dim">
            ╚══════════════════════════════════════════╝
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-terminal-green-dim mb-1">
              login:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
              placeholder="root"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="block text-xs text-terminal-green-dim mb-1">
              password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={status === "auth"}
            className="w-full border border-terminal-green text-terminal-green font-mono py-2 text-sm hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
          >
            {status === "auth" ? "Authenticating..." : "CONNECT"}
          </button>
        </form>

        {/* Status */}
        <div className="mt-6 text-center text-sm font-mono h-6">
          {status === "auth" && (
            <TypewriterText
              text="Verifying credentials..."
              className="text-terminal-amber"
              charDelay={0.03}
            />
          )}
          {status === "granted" && (
            <span className="text-terminal-green font-bold">
              ACCESS GRANTED
            </span>
          )}
          {status === "denied" && (
            <GlitchText
              text="ACCESS DENIED"
              className="text-terminal-red"
              intensity={3}
              color="#FF0033"
            />
          )}
        </div>

        {/* Forgot password */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push("/forgot-password")}
            className="text-xs font-mono text-terminal-green-dim opacity-50 hover:text-terminal-cyan hover:opacity-100 transition-all"
          >
            forgot password?
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-terminal-green-dim opacity-30">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="hover:text-terminal-green transition-colors"
          >
            ← back to terminal
          </button>
        </div>
      </div>
    </div>
  );
}
