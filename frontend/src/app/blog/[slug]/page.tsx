"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Post } from "@/types";

const API_BASE = "";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const date = new Date(post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          <span>{post.author}</span>
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

      {/* Post body */}
      <div className="prose-fs0ciety max-w-none">
        {/* Render MDX content as HTML for now.
            Once MDX pipeline is wired up, this will use next-mdx-remote or similar. */}
        <div dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(post.content) }} />
      </div>
    </article>
  );
}

/**
 * Minimal markdown-to-HTML for MVP display.
 * Will be replaced by proper MDX rendering pipeline.
 */
function renderBasicMarkdown(md: string): string {
  return md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // H3
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    // H2
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    // H1
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Blockquote
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    // Unordered list items
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // HR
    .replace(/^---$/gm, "<hr>")
    // Paragraphs (double newline)
    .replace(/\n\n/g, "</p><p>")
    // Single newline to <br>
    .replace(/\n/g, "<br>")
    // Wrap in paragraph
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
