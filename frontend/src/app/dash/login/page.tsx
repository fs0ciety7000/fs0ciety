"use client";

import { useState, useEffect } from "react";

export default function DashLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"terminal" | "industrial">("industrial");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fs0ciety_dash_theme");
      if (saved === "terminal") setTheme("terminal");
    } catch { /* ignore */ }
  }, []);

  const ind = theme === "industrial";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/dash/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Session cookie set server-side — navigate to dash root
        const isDashSubdomain = typeof window !== "undefined" &&
          window.location.hostname.startsWith("dash.");
        window.location.href = isDashSubdomain ? "/" : "/dash";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 font-mono ${
        ind ? "bg-[#0D0E11]" : "bg-terminal-black"
      }`}
      style={
        ind
          ? {
              backgroundImage:
                "linear-gradient(rgba(37,40,50,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(37,40,50,0.35) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }
          : undefined
      }
    >
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="fs0ciety"
            width={40}
            height={40}
            className={`mx-auto mb-3 ${ind ? "opacity-50" : "opacity-70"}`}
          />
          <h1
            className={
              ind
                ? "font-mono text-2xl font-black uppercase tracking-[0.18em] text-[#E8E4DC]"
                : "text-xl font-bold text-terminal-green"
            }
          >
            fs0ciety
            <span className={ind ? "text-[#F5622A]" : "text-terminal-green-dim"}>
              .dash
            </span>
          </h1>
          <p
            className={`text-[10px] mt-1 uppercase tracking-widest ${
              ind ? "text-[#5A5550]" : "text-terminal-green-dim/50"
            }`}
          >
            Jellyseerr authentication required
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className={`relative p-6 border ${
            ind
              ? "bg-[#141619] border-[#252830]"
              : "bg-terminal-black-light border-terminal-green/20"
          }`}
        >
          {/* Corner brackets for industrial theme */}
          {ind && (
            <>
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 10,
                  height: 10,
                  borderColor: "#F5622A",
                  borderStyle: "solid",
                  borderWidth: "1.5px 0 0 1.5px",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderColor: "#F5622A",
                  borderStyle: "solid",
                  borderWidth: "1.5px 1.5px 0 0",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: 10,
                  height: 10,
                  borderColor: "#F5622A",
                  borderStyle: "solid",
                  borderWidth: "0 0 1.5px 1.5px",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderColor: "#F5622A",
                  borderStyle: "solid",
                  borderWidth: "0 1.5px 1.5px 0",
                }}
              />
            </>
          )}

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label
                className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${
                  ind ? "text-[#9A948C]" : "text-terminal-green-dim"
                }`}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className={`w-full px-3 py-2 text-sm font-mono border outline-none transition-colors ${
                  ind
                    ? "bg-[#0D0E11] border-[#252830] text-[#E8E4DC] focus:border-[#F5622A]/50 placeholder-[#383530]"
                    : "bg-terminal-black border-terminal-gray-light text-terminal-green focus:border-terminal-green/60 placeholder-terminal-green-dim/30"
                }`}
                placeholder="user@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${
                  ind ? "text-[#9A948C]" : "text-terminal-green-dim"
                }`}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={`w-full px-3 py-2 text-sm font-mono border outline-none transition-colors ${
                  ind
                    ? "bg-[#0D0E11] border-[#252830] text-[#E8E4DC] focus:border-[#F5622A]/50 placeholder-[#383530]"
                    : "bg-terminal-black border-terminal-gray-light text-terminal-green focus:border-terminal-green/60 placeholder-terminal-green-dim/30"
                }`}
                placeholder="••••••••"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className={`text-[11px] font-mono px-3 py-2 border ${
                  ind
                    ? "text-[#F87171] bg-[#F87171]/5 border-[#F87171]/20"
                    : "text-terminal-red bg-terminal-red/5 border-terminal-red/20"
                }`}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 text-xs font-mono font-bold uppercase tracking-widest transition-all border ${
                ind
                  ? "bg-[#F5622A] border-[#F5622A] text-[#0D0E11] hover:bg-[#F5622A]/90 disabled:opacity-40"
                  : "bg-terminal-green border-terminal-green text-terminal-black hover:bg-terminal-green/90 disabled:opacity-40"
              }`}
            >
              {loading ? "Authenticating..." : "Sign in"}
            </button>
          </div>
        </form>

        {/* Theme toggle */}
        <div className="mt-4 text-center">
          <button
            onClick={() =>
              setTheme(ind ? "terminal" : "industrial")
            }
            className={`text-[9px] font-mono uppercase tracking-widest transition-colors ${
              ind
                ? "text-[#383530] hover:text-[#5A5550]"
                : "text-terminal-green-dim/30 hover:text-terminal-green-dim/60"
            }`}
          >
            Switch to {ind ? "terminal" : "neo-industrial"} theme
          </button>
        </div>
      </div>
    </div>
  );
}
