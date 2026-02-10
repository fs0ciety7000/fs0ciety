"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { GlitchText } from "@/components/effects/GlitchText";
import type { UserPublic, UserStats } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserPublic | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const raw = localStorage.getItem("fs0ciety_user");
        const token = localStorage.getItem("fs0ciety_token");
        if (!raw || !token) { router.replace("/login"); return; }
        const user = JSON.parse(raw);
        const [data, userStats] = await Promise.all([
          api.profile(user.username, token),
          api.userStats(user.username).catch(() => null),
        ]);
        setProfile(data);
        setStats(userStats);
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
          <GlitchText text="MY PROFILE" className="text-2xl" intensity={1} hoverOnly />
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/profile/settings")}
              className="text-xs font-mono border border-terminal-amber/30 text-terminal-amber px-3 py-1 hover:text-terminal-green hover:border-terminal-green/40 transition-colors"
            >
              settings
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
              {!profile.profile_public && (
                <span className="text-xs px-2 py-0.5 border border-terminal-red/30 text-terminal-red-dim ml-2">
                  private
                </span>
              )}
              {profile.bio && (
                <p className="text-sm text-terminal-green-dim mt-3 leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <div className="text-xs text-terminal-green-dim uppercase tracking-wider mb-1">Member Since</div>
            <div className="text-sm text-terminal-green">{memberSince}</div>
          </div>
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <div className="text-xs text-terminal-green-dim uppercase tracking-wider mb-1">Last Seen</div>
            <div className="text-sm text-terminal-green">{lastSeen}</div>
          </div>
          {stats && (
            <>
              <div className="border border-terminal-cyan/20 bg-terminal-black-light p-4">
                <div className="text-xs text-terminal-cyan/60 uppercase tracking-wider mb-1">Articles</div>
                <div className="text-2xl text-terminal-cyan font-bold">{stats.total_posts}</div>
              </div>
              <div className="border border-terminal-cyan/20 bg-terminal-black-light p-4">
                <div className="text-xs text-terminal-cyan/60 uppercase tracking-wider mb-1">Total Words</div>
                <div className="text-2xl text-terminal-cyan font-bold">{stats.total_words.toLocaleString()}</div>
              </div>
            </>
          )}
        </div>

        {/* Extended stats row */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
              <div className="text-xs text-terminal-green-dim uppercase tracking-wider mb-1">Total Views</div>
              <div className="text-lg text-terminal-green font-bold">{stats.total_views.toLocaleString()}</div>
            </div>
            <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
              <div className="text-xs text-terminal-green-dim uppercase tracking-wider mb-1">Tags Used</div>
              <div className="text-lg text-terminal-green font-bold">{stats.total_tags}</div>
            </div>
          </div>
        )}

        {/* Tags cloud */}
        {stats && stats.tags.length > 0 && (
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4 mb-6">
            <h3 className="text-xs text-terminal-amber uppercase tracking-wider mb-3">Topics</h3>
            <div className="flex flex-wrap gap-2">
              {stats.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 border border-terminal-green/20 text-terminal-green-dim"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Articles list */}
        {stats && stats.posts.length > 0 && (
          <div className="border border-terminal-green/20 bg-terminal-black-light mb-6">
            <div className="p-4 border-b border-terminal-green/10">
              <h3 className="text-xs text-terminal-amber uppercase tracking-wider">
                Published Articles ({stats.total_posts})
              </h3>
            </div>
            <div className="divide-y divide-terminal-green/10">
              {stats.posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block p-4 hover:bg-terminal-green/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-terminal-green group-hover:text-terminal-cyan transition-colors truncate">
                        {post.title}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-terminal-green-dim">
                          {new Date(post.created_at).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </span>
                        {post.tags.length > 0 && (
                          <span className="text-[10px] text-terminal-green/40">
                            {post.tags.map((t) => `#${t}`).join(" ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-terminal-green-dim shrink-0">
                      {post.views} views
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
          <h3 className="text-xs text-terminal-amber uppercase tracking-wider mb-3">Quick Links</h3>
          <div className="space-y-2">
            <button onClick={() => router.push(`/profile/${profile.username}`)} className="block text-sm text-terminal-green-dim hover:text-terminal-green transition-colors">
              → Public Profile
            </button>
            <button onClick={() => router.push("/blog")} className="block text-sm text-terminal-green-dim hover:text-terminal-green transition-colors">
              → Blog
            </button>
            {profile.role === "admin" && (
              <>
                <button onClick={() => router.push("/admin")} className="block text-sm text-terminal-green-dim hover:text-terminal-green transition-colors">
                  → Admin Panel
                </button>
                <button onClick={() => router.push("/dashboard")} className="block text-sm text-terminal-green-dim hover:text-terminal-green transition-colors">
                  → Command Center
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
