"use client";

import { useState, useEffect } from "react";

export default function DashLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"terminal" | "industrial" | "observatory">("observatory");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fs0ciety_dash_theme_v2");
      if (saved === "terminal" || saved === "observatory") setTheme(saved);
    } catch { /* ignore */ }
  }, []);

  const ind = theme === "industrial";
  const observatory = theme === "observatory";
  const darkBg = observatory ? "#101722" : "#141514";
  const darkPanel = observatory ? "#172130" : "#1C1E1B";
  const darkLine = observatory ? "#344253" : "#3C403A";
  const darkText = observatory ? "#F0F4F8" : "#F0EDE4";
  const darkMuted = observatory ? "#A8B7C9" : "#A19F93";
  const darkDim = observatory ? "#718196" : "#74776E";
  const darkAccent = observatory ? "#D9BD82" : "#F25B38";

  const chooseTheme = (value: "terminal" | "industrial" | "observatory") => {
    setTheme(value);
    localStorage.setItem("fs0ciety_dash_theme_v2", value);
  };

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
        ind ? "bg-[#F4F2EA]" : "text-[#F0F4F8]"
      }`}
      style={ind ? undefined : { backgroundColor: darkBg }}
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
                : "font-display text-2xl font-black uppercase tracking-[0.12em]"
            }
            style={ind ? undefined : { color: darkText }}
          >
            fs0ciety
            <span className={ind ? "text-[#E51D2A]" : ""} style={ind ? undefined : { color: darkAccent }}>
              .dash
            </span>
          </h1>
          <p
            className={`text-[10px] mt-1 uppercase tracking-widest ${
              ind ? "text-[#68645D]" : ""
            }`}
            style={ind ? undefined : { color: darkMuted }}
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
              : ""
          }`}
          style={ind ? undefined : { backgroundColor: darkPanel, borderColor: darkLine }}
        >
          <div className="space-y-4">
            {/* Email */}
            <div>
              <label
                className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${
                  ind ? "text-[#68645D]" : ""
                }`}
                style={ind ? undefined : { color: darkMuted }}
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
                    : "border focus:border-[var(--login-accent)] placeholder-[#74776E]"
                }`}
                style={ind ? undefined : { backgroundColor: darkBg, borderColor: darkLine, color: darkText, "--login-accent": darkAccent } as React.CSSProperties}
                placeholder="user@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                className={`block text-[10px] font-mono uppercase tracking-widest mb-1.5 ${
                  ind ? "text-[#68645D]" : ""
                }`}
                style={ind ? undefined : { color: darkMuted }}
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
                    : "border focus:border-[var(--login-accent)] placeholder-[#74776E]"
                }`}
                style={ind ? undefined : { backgroundColor: darkBg, borderColor: darkLine, color: darkText, "--login-accent": darkAccent } as React.CSSProperties}
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
                  : "disabled:opacity-40"
              }`}
              style={ind ? undefined : { backgroundColor: darkAccent, borderColor: darkAccent, color: darkBg }}
            >
              {loading ? "Authenticating..." : "Sign in"}
            </button>
          </div>
        </form>

        {/* Theme toggle */}
        <div className="mt-4 flex justify-center gap-1" role="group" aria-label="Dashboard theme">
          {(["industrial", "terminal", "observatory"] as const).map((value) => {
            const active = theme === value;
            const label = value === "industrial" ? "SWISS" : value === "terminal" ? "KINETIC" : "NIGHT";
            const accent = value === "industrial" ? "#E51D2A" : value === "terminal" ? "#F25B38" : "#D9BD82";
            return (
              <button key={value} type="button" onClick={() => chooseTheme(value)} aria-pressed={active}
                className="border px-2.5 py-1.5 text-[9px] font-mono font-bold tracking-widest transition-colors"
                style={{ color: active ? (value === "industrial" ? "white" : darkBg) : (ind ? "#68645D" : darkDim), backgroundColor: active ? accent : "transparent", borderColor: active ? accent : (ind ? "#BBB8AF" : darkLine) }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
