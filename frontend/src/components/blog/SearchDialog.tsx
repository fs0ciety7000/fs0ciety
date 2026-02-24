"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { PostMeta } from "@/types";

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Fetch posts once on first open
  useEffect(() => {
    if (!open || posts.length > 0) return;
    fetch("/api/posts")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => {});
  }, [open, posts.length]);

  // Ctrl+K / Cmd+K handler
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const filtered = query.trim()
    ? posts.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.excerpt?.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
        );
      })
    : posts;

  const handleSelect = useCallback(
    (slug: string) => {
      setOpen(false);
      router.push(`/blog/${slug}`);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && filtered[selected]) {
      handleSelect(filtered[selected].slug);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9990] flex items-start justify-center pt-[20vh]"
          onClick={() => setOpen(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="spectr-search-backdrop fixed inset-0" />
          <motion.div
            className="spectr-search-panel relative w-full max-w-xl mx-4"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--spectr-border-primary)" }}>
              <span className="spectr-label-accent" style={{ color: "var(--spectr-accent-primary)" }}>$</span>
              <span className="spectr-label" style={{ color: "var(--spectr-text-muted)" }}>grep</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="search posts..."
                className="flex-1 bg-transparent font-mono text-sm outline-none"
                style={{ color: "var(--spectr-text-primary)" }}
              />
              <kbd
                className="spectr-label border px-1.5 py-0.5"
                style={{ borderColor: "var(--spectr-border-primary)", color: "var(--spectr-text-muted)" }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[40vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-center spectr-caption" style={{ color: "var(--spectr-text-muted)" }}>
                  {query ? "No matches found." : "Loading posts..."}
                </div>
              ) : (
                filtered.slice(0, 10).map((post, i) => (
                  <button
                    key={post.slug}
                    onClick={() => handleSelect(post.slug)}
                    className={`spectr-search-result w-full text-left px-4 py-3 flex flex-col gap-1 ${
                      i === selected ? "spectr-search-result-active" : ""
                    }`}
                  >
                    <span className="text-sm font-mono" style={{ color: "var(--spectr-text-primary)" }}>
                      {post.title}
                    </span>
                    <span className="spectr-caption">
                      {post.tags.map((t) => `#${t}`).join(" ")}
                      {post.tags.length > 0 && " \u00B7 "}
                      {post.readingTime}m read
                      {typeof post.views === "number" &&
                        ` \u00B7 0x${post.views.toString(16).toUpperCase()} views`}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div
              className="flex items-center gap-4 px-4 py-2 border-t spectr-caption"
              style={{ borderColor: "var(--spectr-border-primary)", color: "var(--spectr-text-muted)", opacity: 0.5 }}
            >
              <span>
                <kbd className="border px-1" style={{ borderColor: "var(--spectr-border-primary)" }}>&uarr;</kbd>
                <kbd className="border px-1 ml-0.5" style={{ borderColor: "var(--spectr-border-primary)" }}>&darr;</kbd>
                {" "}navigate
              </span>
              <span>
                <kbd className="border px-1" style={{ borderColor: "var(--spectr-border-primary)" }}>&crarr;</kbd>
                {" "}open
              </span>
              <span>
                <kbd className="border px-1" style={{ borderColor: "var(--spectr-border-primary)" }}>esc</kbd>
                {" "}close
              </span>
              <span className="ml-auto">
                <kbd className="border px-1" style={{ borderColor: "var(--spectr-border-primary)" }}>&mdash;K</kbd>
                {" "}toggle
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
