"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl mx-4 border border-terminal-green/40 bg-terminal-black shadow-[0_0_30px_rgba(0,255,65,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-terminal-gray-light">
          <span className="text-terminal-green text-sm font-mono">$</span>
          <span className="text-terminal-green-dim text-sm font-mono">
            grep
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="search posts..."
            className="flex-1 bg-transparent text-terminal-green font-mono text-sm outline-none placeholder:text-terminal-green-dim/40"
          />
          <kbd className="text-[10px] font-mono text-terminal-green-dim border border-terminal-gray-light px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[40vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm font-mono text-terminal-green-dim/50">
              {query ? "No matches found." : "Loading posts..."}
            </div>
          ) : (
            filtered.slice(0, 10).map((post, i) => (
              <button
                key={post.slug}
                onClick={() => handleSelect(post.slug)}
                className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors ${
                  i === selected
                    ? "bg-terminal-green/10"
                    : "hover:bg-terminal-gray-light/50"
                }`}
              >
                <span className="text-sm font-mono text-terminal-green">
                  {post.title}
                </span>
                <span className="text-xs font-mono text-[#a3a3a3]">
                  {post.tags.map((t) => `#${t}`).join(" ")}
                  {post.tags.length > 0 && " \u00B7 "}
                  {post.readingTime} min read
                  {typeof post.views === "number" &&
                    ` \u00B7 0x${post.views.toString(16).toUpperCase()} views`}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-terminal-gray-light text-[10px] font-mono text-terminal-green-dim/50">
          <span>
            <kbd className="border border-terminal-gray-light px-1">↑</kbd>
            <kbd className="border border-terminal-gray-light px-1 ml-0.5">
              ↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="border border-terminal-gray-light px-1">↵</kbd>{" "}
            open
          </span>
          <span>
            <kbd className="border border-terminal-gray-light px-1">esc</kbd>{" "}
            close
          </span>
          <span className="ml-auto">
            <kbd className="border border-terminal-gray-light px-1">⌘K</kbd>{" "}
            toggle
          </span>
        </div>
      </div>
    </div>
  );
}
