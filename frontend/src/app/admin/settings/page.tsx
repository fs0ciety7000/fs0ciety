"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("New passwords do not match");
      return;
    }
    if (newPassword.length < 4) {
      setStatus("error");
      setMessage("New password must be at least 4 characters");
      return;
    }

    setStatus("saving");
    try {
      const token = localStorage.getItem("fs0ciety_token") || "";
      await api.changePassword(currentPassword, newPassword, token);
      setStatus("success");
      setMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to change password");
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-mono font-bold text-terminal-green mb-1">
          Settings
        </h1>
        <p className="text-sm font-mono text-terminal-green-dim opacity-60">
          Account settings &mdash; fs0ciety admin
        </p>
      </div>

      {/* Link to full profile settings */}
      <div className="max-w-md border border-terminal-amber/20 bg-terminal-black-light p-4 mb-6">
        <p className="text-sm font-mono text-terminal-green-dim mb-3">
          Edit your profile (avatar, bio, username, privacy) in the profile settings page:
        </p>
        <Link
          href="/profile/settings"
          className="inline-block text-sm font-mono border border-terminal-amber/30 text-terminal-amber px-4 py-2 hover:bg-terminal-amber/10 transition-colors"
        >
          → Profile Settings
        </Link>
      </div>

      {/* Change Password */}
      <div className="max-w-md border border-terminal-gray-light bg-terminal-black-light p-6">
        <h2 className="text-lg font-mono font-bold text-terminal-green mb-4">
          Change Password
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-terminal-green-dim mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-terminal-green-dim mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={4}
              className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-terminal-green-dim mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={4}
              className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
            />
          </div>

          <button
            type="submit"
            disabled={status === "saving"}
            className="w-full border border-terminal-green text-terminal-green font-mono py-2 text-sm hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
          >
            {status === "saving" ? "Updating..." : "Change Password"}
          </button>
        </form>

        {/* Status message */}
        {message && (
          <div
            className={`mt-4 text-xs font-mono ${
              status === "success" ? "text-terminal-green" : "text-terminal-red"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
