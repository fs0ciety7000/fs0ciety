"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { GlitchText } from "@/components/effects/GlitchText";
import type { UserPublic } from "@/types";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");

  // Editable fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profilePublic, setProfilePublic] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Status
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const t = localStorage.getItem("fs0ciety_token");
        const raw = localStorage.getItem("fs0ciety_user");
        if (!t || !raw) { router.replace("/login"); return; }
        setToken(t);
        const user = JSON.parse(raw);
        const data = await api.profile(user.username, t);
        setProfile(data);
        setUsername(data.username);
        setEmail(data.email || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
        setProfilePublic(data.profile_public ?? true);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    try {
      const changes: Record<string, unknown> = {};
      if (username !== profile.username) changes.username = username;
      if (email !== (profile.email || "")) changes.email = email;
      if (bio !== (profile.bio || "")) changes.bio = bio;
      if (avatarUrl !== (profile.avatar_url || "")) changes.avatar_url = avatarUrl;
      if (profilePublic !== profile.profile_public) changes.profile_public = profilePublic;

      if (Object.keys(changes).length === 0) {
        setMessage({ type: "error", text: "No changes to save" });
        setSaving(false);
        return;
      }

      const result = await api.updateProfile(changes, token);
      setProfile(result.user);
      setMessage({ type: "success", text: "Profile updated" });

      // Update localStorage if username changed
      if (changes.username) {
        const raw = localStorage.getItem("fs0ciety_user");
        if (raw) {
          const u = JSON.parse(raw);
          u.username = changes.username;
          localStorage.setItem("fs0ciety_user", JSON.stringify(u));
        }
      }
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (newPassword.length < 4) {
      setPwMessage({ type: "error", text: "Password must be at least 4 characters" });
      return;
    }
    try {
      await api.changePassword(currentPassword, newPassword, token);
      setPwMessage({ type: "success", text: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwMessage({ type: "error", text: err instanceof Error ? err.message : "Failed" });
    }
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true);
    try {
      const result = await api.upload(file, token);
      setAvatarUrl(result.url);
      // Auto-save avatar immediately
      const res = await api.updateProfile({ avatar_url: result.url }, token);
      setProfile(res.user);
      setMessage({ type: "success", text: "Avatar uploaded" });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-black flex items-center justify-center">
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!profile) return null;

  const inputClass = "w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60 placeholder:text-terminal-green/20";
  const labelClass = "block text-xs font-mono text-terminal-green-dim mb-1";
  const sectionClass = "border border-terminal-green/20 bg-terminal-black-light p-6 mb-6";

  return (
    <div className="min-h-screen bg-terminal-black p-4 md:p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-terminal-gray-light">
          <GlitchText text="PROFILE SETTINGS" className="text-2xl" intensity={1} hoverOnly />
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/profile")}
              className="text-xs font-mono border border-terminal-green/20 text-terminal-green-dim px-3 py-1 hover:text-terminal-green hover:border-terminal-green/40 transition-colors"
            >
              ← profile
            </button>
            <button
              onClick={() => router.push("/blog")}
              className="text-xs font-mono border border-terminal-green/20 text-terminal-green-dim px-3 py-1 hover:text-terminal-green hover:border-terminal-green/40 transition-colors"
            >
              ← blog
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-xs font-mono border border-terminal-green/20 text-terminal-green-dim px-3 py-1 hover:text-terminal-green hover:border-terminal-green/40 transition-colors"
            >
              ← terminal
            </button>
          </div>
        </div>

        {/* Avatar */}
        <div className={sectionClass}>
          <h2 className="text-sm font-bold text-terminal-amber uppercase tracking-wider mb-4">Avatar</h2>
          <div className="flex items-center gap-6">
            <div className="shrink-0 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-24 h-24 object-cover border border-terminal-green/30"
                />
              ) : (
                <div className="w-24 h-24 border border-terminal-green/30 flex items-center justify-center text-4xl text-terminal-green-dim">
                  {username[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-terminal-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-terminal-green">
                  {uploading ? "uploading..." : "change"}
                </span>
              </div>
            </div>
            <div className="text-xs text-terminal-green-dim space-y-1">
              <p>Click avatar to upload a new image.</p>
              <p>Supported: PNG, JPG, GIF, WebP, SVG (max 10MB)</p>
              {avatarUrl && (
                <button
                  onClick={async () => {
                    const res = await api.updateProfile({ avatar_url: "" }, token);
                    setAvatarUrl("");
                    setProfile(res.user);
                  }}
                  className="text-terminal-red-dim hover:text-terminal-red transition-colors"
                >
                  Remove avatar
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
            />
          </div>
        </div>

        {/* Profile Info */}
        <form onSubmit={handleSaveProfile}>
          <div className={sectionClass}>
            <h2 className="text-sm font-bold text-terminal-amber uppercase tracking-wider mb-4">Profile Info</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell something about yourself..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-terminal-green/10">
                <div>
                  <div className="text-sm text-terminal-green">Public Profile</div>
                  <div className="text-xs text-terminal-green-dim">
                    {profilePublic
                      ? "Other users and guests can view your profile"
                      : "Only you and admins can view your full profile"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfilePublic(!profilePublic)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    profilePublic ? "bg-terminal-green/30" : "bg-terminal-red/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                      profilePublic
                        ? "left-6 bg-terminal-green"
                        : "left-0.5 bg-terminal-red-dim"
                    }`}
                  />
                </button>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full border border-terminal-green text-terminal-green font-mono py-2 text-sm hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              {message && (
                <div className={`text-xs ${message.type === "success" ? "text-terminal-green" : "text-terminal-red"}`}>
                  {message.text}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handleChangePassword}>
          <div className={sectionClass}>
            <h2 className="text-sm font-bold text-terminal-amber uppercase tracking-wider mb-4">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={4}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={4}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="w-full border border-terminal-green text-terminal-green font-mono py-2 text-sm hover:bg-terminal-green/10 transition-colors"
              >
                Change Password
              </button>
              {pwMessage && (
                <div className={`text-xs ${pwMessage.type === "success" ? "text-terminal-green" : "text-terminal-red"}`}>
                  {pwMessage.text}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="border border-terminal-red/20 bg-terminal-black-light p-6">
          <h2 className="text-sm font-bold text-terminal-red uppercase tracking-wider mb-4">Danger Zone</h2>
          <button
            onClick={() => {
              localStorage.removeItem("fs0ciety_token");
              localStorage.removeItem("fs0ciety_user");
              router.push("/login");
            }}
            className="border border-terminal-red/30 text-terminal-red-dim font-mono px-4 py-2 text-sm hover:bg-terminal-red/10 hover:text-terminal-red transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
