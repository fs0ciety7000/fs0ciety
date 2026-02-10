import Link from "next/link";
import type { PostMeta } from "@/types";

interface PostCardProps {
  post: PostMeta;
}

export function PostCard({ post }: PostCardProps) {
  const d = new Date(post.createdAt);
  const date = isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <article className="group border border-terminal-gray-light hover:border-terminal-green/40 bg-terminal-black-light transition-colors">
      <Link href={`/blog/${post.slug}`} className="block p-6">
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-2 text-xs font-mono text-terminal-green-dim opacity-50">
          {post.author && (
            <>
              <span className="text-terminal-cyan">{post.author}</span>
              <span>&middot;</span>
            </>
          )}
          <time>{date}</time>
          <span>&middot;</span>
          <span>{post.readingTime} min read</span>
          <span>&middot;</span>
          <span>{post.wordCount} words</span>
        </div>

        {/* Title */}
        <h2 className="text-lg font-mono font-bold text-terminal-green group-hover:text-terminal-green-dim transition-colors mb-2">
          {post.title}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-sm text-[#a3a3a3] font-sans mb-3 line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono px-2 py-0.5 border border-terminal-green/20 text-terminal-green-dim"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Read more indicator */}
        <div className="mt-4 text-xs font-mono text-terminal-cyan opacity-0 group-hover:opacity-60 transition-opacity">
          cat {post.slug} &rarr;
        </div>
      </Link>
    </article>
  );
}
