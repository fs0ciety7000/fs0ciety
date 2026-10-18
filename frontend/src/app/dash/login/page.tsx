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
      const saved = localStorage.getItem("fs0ciety_dash_theme_v2");
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
        ind ? "bg-[#F4F2EA]" : "bg-[#141514] text-[#F0EDE4]"
      }`}
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
                ? "font-display text-2xl font-black uppercase tracking-[0.12em] text-[#111111]"
                : "font-display text-2xl font-black uppercase tracking-[0.12em] text-[#F0EDE4]"
            }
          >
            fs0ciety
            <span className={ind ? "text-[#E51D2A]" : "text-[#F25B38]"}>
              .dash
            </span>
          </h1>
          <p
            className={`text-[10px] mt-1 uppercase tracking-widest ${
              ind ? "text-[#68645D]" : "text-[#A19F93]"
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
              ? "bg-[#ECE9E0] border-[#111111]"
              : "bg-[#1C1E1B] border-[#3C403A]"
          }`}
        >
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label
                className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${
                  ind ? "text-[#68645D]" : "text-[#A19F93]"
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
                    ? "bg-[#F4F2EA] border-[#BBB8AF] text-[#111111] focus:border-[#E51D2A] placeholder-[#68645D]"
                    : "bg-[#141514] border-[#3C403A] text-[#F0EDE4] focus:border-[#F25B38] placeholder-[#74776E]"
                }`}
                placeholder="user@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${
                  ind ? "text-[#68645D]" : "text-[#A19F93]"
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
                    ? "bg-[#F4F2EA] border-[#BBB8AF] text-[#111111] focus:border-[#E51D2A] placeholder-[#68645D]"
                    : "bg-[#141514] border-[#3C403A] text-[#F0EDE4] focus:border-[#F25B38] placeholder-[#74776E]"
                }`}
                placeholder="••••••••"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className={`text-[11px] font-mono px-3 py-2 border ${
                  ind
                    ? "text-[#E51D2A] bg-[#E51D2A]/5 border-[#E51D2A]/20"
                    : "text-[#F25B38] bg-[#F25B38]/5 border-[#F25B38]/20"
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
                  ? "bg-[#E51D2A] border-[#E51D2A] text-white hover:bg-[#E51D2A]/90 disabled:opacity-40"
                  : "bg-[#F25B38] border-[#F25B38] text-[#141514] hover:bg-[#F25B38]/90 disabled:opacity-40"
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
                ? "text-[#68645D] hover:text-[#111111]"
                : "text-[#74776E] hover:text-[#A19F93]"
            }`}
          >
            Switch to {ind ? "Kinetic Foundry" : "Swiss Control"} theme
          </button>
        </div>
      </div>
    </div>
  );
}
