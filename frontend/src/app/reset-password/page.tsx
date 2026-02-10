"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GlitchText } from "@/components/effects/GlitchText";
import { api } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "resetting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing reset token. Please use the link from your email.");
    }
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 4) {
      setMessage("Password must be at least 4 characters");
      setStatus("error");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      setStatus("error");
      return;
    }

    setStatus("resetting");
    try {
      const res = await api.resetPassword(token, newPassword);
      setMessage(res.message);
      setStatus("done");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    }
  }

  return (
    <div className="w-full max-w-lg border border-terminal-green/30 bg-terminal-black-light p-8">
      <div className="mb-8 text-center">
        <GlitchText
          text="NEW PASSWORD"
          className="text-3xl mb-2"
          intensity={1}
          hoverOnly
        />
        <div className="text-terminal-green-dim text-xs opacity-50">
          fs0ciety // set your new password
        </div>
      </div>

      {status === "done" ? (
        <div className="text-center space-y-4">
          <div className="text-terminal-green text-sm font-mono font-bold">
            PASSWORD RESET SUCCESSFUL
          </div>
          <div className="text-terminal-green-dim text-xs">
            Redirecting to login...
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-terminal-green-dim mb-1">
              new password:
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
              placeholder="••••••••"
              autoFocus
              minLength={4}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-terminal-green-dim mb-1">
              confirm password:
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
              placeholder="••••••••"
              minLength={4}
              required
            />
          </div>

          <button
            type="submit"
            disabled={status === "resetting" || !token}
            className="w-full border border-terminal-green text-terminal-green font-mono py-2 text-sm hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
          >
            {status === "resetting" ? "Resetting..." : "RESET PASSWORD"}
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-terminal-black flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
            Loading...
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
