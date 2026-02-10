"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PostCard } from "@/components/blog/PostCard";
import { TagFilter } from "@/components/blog/TagFilter";
import type { PostMeta } from "@/types";

const API_BASE = "";

function BlogPageContent() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const tagParam = searchParams.get("tag");
  const [activeTag, setActiveTag] = useState<string | null>(tagParam);

  useEffect(() => {
    setActiveTag(tagParam);
  }, [tagParam]);

  useEffect(() => {
    fetch(`${API_BASE}/api/posts`)
      .then((r) => r.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    if (!activeTag) return posts;
    return posts.filter((p) => p.tags.includes(activeTag));
  }, [posts, activeTag]);

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-mono font-bold text-terminal-green mb-2">
          /var/log/thoughts
        </h1>
        <p className="text-sm text-[#a3a3a3] font-sans">
          Writings on security, systems, infrastructure, and the spaces in between.
        </p>
        <div className="mt-3">
          <button
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
              window.dispatchEvent(event);
            }}
            className="text-xs font-mono text-terminal-green-dim/50 hover:text-terminal-green-dim transition-colors flex items-center gap-2"
          >
            <span>$ grep</span>
            <kbd className="border border-terminal-gray-light px-1.5 py-0.5 text-[10px]">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="mb-8">
          <TagFilter tags={allTags} active={activeTag} onChange={setActiveTag} />
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
          Loading posts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="font-mono text-terminal-green-dim text-sm">
          No posts found. {activeTag && "Try clearing the filter."}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
          Loading...
        </div>
      }
    >
      <BlogPageContent />
    </Suspense>
  );
}
