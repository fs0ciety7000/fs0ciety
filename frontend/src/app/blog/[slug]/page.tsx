"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Post } from "@/types";

const API_BASE = "";

// ── Types ────────────────────────────────────────────────

interface TocEntry {
  level: number;
  text: string;
  id: string;
}

// ── Component ────────────────────────────────────────────

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(true);

  useEffect(() => {
    if (!params.slug) return;
    fetch(`${API_BASE}/api/posts/${params.slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Post not found");
        return r.json();
      })
      .then((data) => setPost(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const { html, toc } = useMemo(() => {
    if (!post) return { html: "", toc: [] as TocEntry[] };
    return renderMarkdownWithToc(post.content);
  }, [post]);

  if (loading) {
    return (
      <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
        Fetching /{params.slug}...
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <div className="font-mono text-terminal-red text-sm mb-4">
          Error: {error || "Post not found"}
        </div>
        <Link
          href="/blog"
          className="text-xs font-mono text-terminal-cyan hover:text-terminal-green transition-colors"
        >
          &larr; back to posts
        </Link>
      </div>
    );
  }

  const d = new Date(post.createdAt);
  const date = isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <article>
      {/* Back link */}
      <Link
        href="/blog"
        className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green transition-colors inline-block mb-8"
      >
        &larr; cd /blog
      </Link>

      {/* Post header */}
      <header className="mb-10 pb-6 border-b border-terminal-gray-light">
        <h1 className="text-2xl sm:text-3xl font-mono font-bold text-terminal-green mb-3">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#a3a3a3]">
          <time>{date}</time>
          <span className="text-terminal-gray-light">|</span>
          <a
            href={`/profile/${post.author}`}
            className="text-terminal-cyan hover:text-terminal-green transition-colors"
          >
            @{post.author}
          </a>
          <span className="text-terminal-gray-light">|</span>
          <span>{post.readingTime} min read</span>
          <span className="text-terminal-gray-light">|</span>
          <span>{post.wordCount} words</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono px-2 py-0.5 border border-terminal-green/20 text-terminal-green-dim"
            >
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* Table of Contents */}
      {toc.length > 1 && (
        <nav className="toc-container mb-10 border border-terminal-green/20 bg-terminal-black-light font-mono">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs text-terminal-green hover:text-terminal-green-dim transition-colors"
          >
            <span className="uppercase tracking-wider font-bold">
              <span className="text-terminal-amber mr-2">#</span>
              Table of Contents
            </span>
            <span className="text-terminal-green-dim">{tocOpen ? "[-]" : "[+]"}</span>
          </button>
          {tocOpen && (
            <ul className="px-4 pb-4 space-y-1">
              {toc.map((entry) => (
                <li
                  key={entry.id}
                  style={{ paddingLeft: `${(entry.level - 1) * 1}rem` }}
                >
                  <a
                    href={`#${entry.id}`}
                    className="text-xs text-terminal-cyan hover:text-terminal-green transition-colors block py-0.5"
                  >
                    {entry.level === 1 ? "$ " : entry.level === 2 ? "|- " : "   |- "}
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}

      {/* Post body */}
      <div className="prose-fs0ciety max-w-none">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </article>
  );
}

// ── Markdown rendering with ToC ──────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function renderMarkdownWithToc(md: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];

  // First pass: protect code blocks from processing
  const codeBlocks: string[] = [];
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`);
    return `\x00CODEBLOCK_${idx}\x00`;
  });

  // Extract headings and build ToC
  processed = processed.replace(/^(#{1,3}) (.+)$/gm, (_match, hashes: string, text: string) => {
    const level = hashes.length;
    const id = slugify(text);
    toc.push({ level, text, id });
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

  // Inline code
  processed = processed.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Images
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Links
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold
  processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  processed = processed.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Blockquote
  processed = processed.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered list items
  processed = processed.replace(/^- (.+)$/gm, "<li>$1</li>");

  // HR
  processed = processed.replace(/^---$/gm, "<hr>");

  // Paragraphs (double newline)
  processed = processed.replace(/\n\n/g, "</p><p>");

  // Single newline to <br>
  processed = processed.replace(/\n/g, "<br>");

  // Wrap in paragraph
  processed = `<p>${processed}</p>`;

  // Restore code blocks
  processed = processed.replace(/\x00CODEBLOCK_(\d+)\x00/g, (_match, idx) => {
    return codeBlocks[parseInt(idx, 10)];
  });

  return { html: processed, toc };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
