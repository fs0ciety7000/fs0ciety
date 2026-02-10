"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GlitchText } from "@/components/effects/GlitchText";
import type { UserPublic } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem("fs0ciety_user");
        if (!raw) { router.replace("/login"); return; }
        const user = JSON.parse(raw);
        const res = await fetch(`/api/users/${user.username}`);
        if (!res.ok) throw new Error("Failed to load profile");
        setProfile(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-terminal-black flex items-center justify-center">
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-terminal-black flex items-center justify-center">
        <div className="font-mono text-terminal-red text-sm">{error || "Profile not found"}</div>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const lastSeen = profile.last_login
    ? new Date(profile.last_login).toLocaleString()
    : "Never";

  return (
    <div className="min-h-screen bg-terminal-black p-4 md:p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-terminal-gray-light">
          <GlitchText text="USER PROFILE" className="text-2xl" intensity={1} hoverOnly />
          <div className="flex gap-3">
            {profile.role === "admin" && (
              <button
                onClick={() => router.push("/admin/settings")}
                className="text-xs font-mono border border-terminal-green/20 text-terminal-green-dim px-3 py-1 hover:text-terminal-green hover:border-terminal-green/40 transition-colors"
              >
                settings
              </button>
            )}
            <button
              onClick={() => router.push("/")}
              className="text-xs font-mono border border-terminal-green/20 text-terminal-green-dim px-3 py-1 hover:text-terminal-green hover:border-terminal-green/40 transition-colors"
            >
              ← terminal
            </button>
          </div>
        </div>

        {/* Profile card */}
        <div className="border border-terminal-green/20 bg-terminal-black-light p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 object-cover border border-terminal-green/30"
                />
              ) : (
                <div className="w-20 h-20 border border-terminal-green/30 flex items-center justify-center text-3xl text-terminal-green-dim">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl text-terminal-green font-bold mb-1">
                {profile.username}
              </h2>
              <span className={`text-xs px-2 py-0.5 border ${
                profile.role === "admin"
                  ? "border-terminal-amber/30 text-terminal-amber"
                  : "border-terminal-green/30 text-terminal-green-dim"
              }`}>
                {profile.role}
              </span>
              {profile.bio && (
                <p className="text-sm text-terminal-green-dim mt-3 leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <div className="text-xs text-terminal-green-dim uppercase tracking-wider mb-1">Member Since</div>
            <div className="text-sm text-terminal-green">{memberSince}</div>
          </div>
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <div className="text-xs text-terminal-green-dim uppercase tracking-wider mb-1">Last Seen</div>
            <div className="text-sm text-terminal-green">{lastSeen}</div>
          </div>
        </div>

        {/* Quick links */}
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
          <h3 className="text-xs text-terminal-amber uppercase tracking-wider mb-3">Quick Links</h3>
          <div className="space-y-2">
            <button onClick={() => router.push("/blog")} className="block text-sm text-terminal-green-dim hover:text-terminal-green transition-colors">
              &#8594; Blog
            </button>
            {profile.role === "admin" && (
              <>
                <button onClick={() => router.push("/admin")} className="block text-sm text-terminal-green-dim hover:text-terminal-green transition-colors">
                  &#8594; Admin Panel
                </button>
                <button onClick={() => router.push("/dashboard")} className="block text-sm text-terminal-green-dim hover:text-terminal-green transition-colors">
                  &#8594; Command Center
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
