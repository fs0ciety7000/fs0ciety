"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GlitchText } from "@/components/effects/GlitchText";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");

    try {
      const res = await api.forgotPassword(email.trim());
      setMessage(res.message);
      setStatus("sent");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-terminal-black flex items-center justify-center p-4">
      <div className="w-full max-w-lg border border-terminal-green/30 bg-terminal-black-light p-8">
        <div className="mb-8 text-center">
          <GlitchText
            text="PASSWORD RESET"
            className="text-3xl mb-2"
            intensity={1}
            hoverOnly
          />
          <div className="text-terminal-green-dim text-xs opacity-50">
            fs0ciety // account recovery
          </div>
        </div>

        {status === "sent" ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-terminal-green text-sm font-mono mb-4">
                {message}
              </div>
              <div className="text-terminal-green-dim text-xs">
                Check your inbox for the reset link.
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full border border-terminal-green text-terminal-green font-mono py-2 text-sm hover:bg-terminal-green/10 transition-colors"
            >
              BACK TO LOGIN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-4 text-xs font-mono text-terminal-green-dim">
              Enter the email associated with your account. We will send a reset link.
            </div>

            <div>
              <label className="block text-xs text-terminal-green-dim mb-1">
                email:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
                placeholder="user@example.com"
                autoFocus
                autoComplete="email"
                required
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full border border-terminal-green text-terminal-green font-mono py-2 text-sm hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
            >
              {status === "sending" ? "Sending..." : "SEND RESET LINK"}
            </button>

            {status === "error" && (
              <div className="text-center text-sm font-mono text-terminal-red">
                {message}
              </div>
            )}
          </form>
        )}

        <div className="mt-8 text-center text-xs text-terminal-green-dim opacity-30">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="hover:text-terminal-green transition-colors"
          >
            ← back to login
          </button>
        </div>
      </div>
    </div>
  );
}
