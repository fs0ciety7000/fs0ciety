"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { PostMeta } from "@/types";

export default function AdminPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  function loadPosts() {
    const token = localStorage.getItem("fs0ciety_token") || undefined;
    setLoading(true);
    api.admin
      .listPosts(token)
      .then((data) => {
        const sorted = [...data.posts].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPosts(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleDelete(slug: string) {
    if (!confirm(`Delete "${slug}"? This cannot be undone.`)) return;
    setDeleting(slug);
    const token = localStorage.getItem("fs0ciety_token") || undefined;
    try {
      await api.admin.deletePost(slug, token);
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } catch {
      alert("Failed to delete post.");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = posts.filter((p) => {
    if (filter === "published") return p.published;
    if (filter === "draft") return !p.published;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-mono font-bold text-terminal-green mb-1">
            Posts
          </h1>
          <p className="text-sm font-mono text-terminal-green-dim opacity-60">
            {posts.length} total &mdash; {posts.filter((p) => p.published).length}{" "}
            published
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="border border-terminal-green text-terminal-green font-mono text-sm px-4 py-2 hover:bg-terminal-green/10 transition-colors"
        >
          + New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "published", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-mono px-3 py-1.5 border transition-colors ${
              filter === f
                ? "border-terminal-green text-terminal-green bg-terminal-green/10"
                : "border-terminal-gray-light text-terminal-green-dim hover:border-terminal-green/30"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
          Loading posts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-terminal-gray-light bg-terminal-black-light p-8 text-center">
          <div className="text-sm font-mono text-terminal-green-dim mb-4">
            No posts found.
          </div>
          <Link
            href="/admin/posts/new"
            className="text-sm font-mono text-terminal-cyan hover:text-terminal-green"
          >
            Create your first post &rarr;
          </Link>
        </div>
      ) : (
        <div className="border border-terminal-gray-light bg-terminal-black-light">
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
                  Tags
                </th>
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden lg:table-cell">
                  Words
                </th>
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden lg:table-cell">
                  Read Time
                </th>
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden sm:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post) => (
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
                    {post.excerpt && (
                      <div className="text-xs text-terminal-green-dim opacity-50 mt-1 max-w-md truncate">
                        {post.excerpt}
                      </div>
                    )}
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
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-mono px-1.5 py-0.5 border border-terminal-gray-light text-terminal-green-dim"
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs font-mono text-terminal-green-dim">
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim hidden lg:table-cell">
                    {post.wordCount?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim hidden lg:table-cell">
                    {post.readingTime} min
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim hidden sm:table-cell">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/posts/edit?slug=${post.slug}`}
                        className="text-xs font-mono text-terminal-cyan hover:text-terminal-green transition-colors"
                      >
                        edit
                      </Link>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green transition-colors"
                        target="_blank"
                      >
                        view
                      </Link>
                      <button
                        onClick={() => handleDelete(post.slug)}
                        disabled={deleting === post.slug}
                        className="text-xs font-mono text-terminal-red-dim hover:text-terminal-red transition-colors disabled:opacity-50"
                      >
                        {deleting === post.slug ? "..." : "del"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
