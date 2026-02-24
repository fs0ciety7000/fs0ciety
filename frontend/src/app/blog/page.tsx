"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { PostCard } from "@/components/blog/PostCard";
import { TagFilter } from "@/components/blog/TagFilter";
import { CipherLoading } from "@/components/blog/CipherText";
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
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <h1 className="spectr-display text-3xl mb-2" style={{ color: "var(--spectr-accent-primary)" }}>
          /var/log/thoughts
        </h1>
        <p className="spectr-body text-sm" style={{ color: "var(--spectr-text-secondary)" }}>
          Writings on security, systems, infrastructure, and the spaces in between.
        </p>
        <div className="mt-3">
          <button
            onClick={() => {
              const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
              window.dispatchEvent(event);
            }}
            className="spectr-label flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ color: "var(--spectr-text-muted)" }}
          >
            <span style={{ color: "var(--spectr-accent-primary)" }}>$</span>
            <span>grep</span>
            <kbd
              className="border px-1.5 py-0.5"
              style={{ borderColor: "var(--spectr-border-primary)", fontSize: "0.6rem" }}
            >
              Ctrl+K
            </kbd>
          </button>
        </div>
      </motion.div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="mb-8">
          <TagFilter tags={allTags} active={activeTag} onChange={setActiveTag} />
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <CipherLoading text="$ cat /var/log/thoughts/*" />
      ) : filtered.length === 0 ? (
        <motion.div
          className="spectr-caption"
          style={{ color: "var(--spectr-text-muted)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          No posts found. {activeTag && "Try clearing the filter."}
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((post, i) => (
            <PostCard key={post.slug} post={post} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense
      fallback={<CipherLoading text="Initializing /var/log/thoughts..." />}
    >
      <BlogPageContent />
    </Suspense>
  );
}
