"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StatsCard } from "@/components/admin/StatsCard";
import type { AdminStats, PostMeta } from "@/types";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("fs0ciety_token") || undefined;
    Promise.all([api.admin.stats(token), api.admin.listPosts(token)])
      .then(([s, p]) => {
        setStats(s);
        // Sort by createdAt desc, take first 5
        const sorted = [...p.posts].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentPosts(sorted.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-mono font-bold text-terminal-green mb-1">
          Dashboard
        </h1>
        <p className="text-sm font-mono text-terminal-green-dim opacity-60">
          System overview &mdash; fs0ciety admin
        </p>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <StatsCard label="Total Posts" value={stats.totalPosts} icon="[]" />
          <StatsCard
            label="Published"
            value={stats.publishedPosts}
            icon="&gt;"
          />
          <StatsCard label="Drafts" value={stats.draftPosts} icon="~" />
          <StatsCard label="Tags" value={stats.totalTags} icon="#" />
          <StatsCard
            label="Total Words"
            value={stats.totalWords.toLocaleString()}
            icon="W"
          />
        </div>
      )}

      {/* Recent posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-mono font-bold text-terminal-green">
            Recent Posts
          </h2>
          <Link
            href="/admin/posts"
            className="text-xs font-mono text-terminal-cyan hover:text-terminal-green transition-colors"
          >
            View all &rarr;
          </Link>
        </div>

        <div className="border border-terminal-gray-light bg-terminal-black-light">
          {recentPosts.length === 0 ? (
            <div className="p-6 text-sm font-mono text-terminal-green-dim">
              No posts yet.{" "}
              <Link
                href="/admin/posts/new"
                className="text-terminal-cyan hover:text-terminal-green"
              >
                Create your first post &rarr;
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-terminal-gray-light text-left">
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden md:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden sm:table-cell">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden lg:table-cell">
                    Reading
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((post) => (
                  <tr
                    key={post.slug}
                    className="border-b border-terminal-gray-light last:border-0 hover:bg-terminal-green/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/posts/edit?slug=${post.slug}`}
                        className="text-sm font-mono text-terminal-green hover:text-terminal-cyan transition-colors"
                      >
                        {post.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span
                        className={`text-xs font-mono px-2 py-0.5 border ${
                          post.published
                            ? "border-terminal-green/30 text-terminal-green"
                            : "border-terminal-amber/30 text-terminal-amber"
                        }`}
                      >
                        {post.published ? "LIVE" : "DRAFT"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim hidden sm:table-cell">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim hidden lg:table-cell">
                      {post.readingTime} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
