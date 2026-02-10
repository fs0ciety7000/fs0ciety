"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PostMeta } from "@/types";

const CIPHER = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?";

function useCipherReveal(text: string, speed = 20, cycles = 3) {
  const [display, setDisplay] = useState(text);
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    let charIdx = 0;
    let cycle = 0;
    const revealed: string[] = [];

    function tick() {
      if (charIdx >= text.length) { setDisplay(text); return; }
      if (cycle < cycles) {
        setDisplay(
          revealed.join("") +
          Array.from({ length: text.length - charIdx }, () =>
            CIPHER[Math.floor(Math.random() * CIPHER.length)]
          ).join("")
        );
        cycle++;
      } else {
        revealed.push(text[charIdx]);
        charIdx++;
        cycle = 0;
      }
      setTimeout(tick, speed);
    }
    tick();
  }, [text, speed, cycles]);

  return display;
}

interface PostCardProps {
  post: PostMeta;
}

export function PostCard({ post }: PostCardProps) {
  const d = new Date(post.createdAt);
  const date = isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const cipherTitle = useCipherReveal(post.title);

  return (
    <article className="group post-card-glitch border border-terminal-gray-light hover:border-terminal-green/40 bg-terminal-black-light transition-colors">
      <Link href={`/blog/${post.slug}`} className="block p-6">
        {/* Meta row */}
        <div className="flex items-center gap-3 mb-2 text-xs font-mono text-terminal-green-dim opacity-50">
          {post.author && (
            <>
              <span
                className="text-terminal-cyan hover:text-terminal-green transition-colors cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/profile/${post.author}`;
                }}
                role="link"
                tabIndex={0}
              >
                @{post.author}
              </span>
              <span>&middot;</span>
            </>
          )}
          <time>{date}</time>
          <span>&middot;</span>
          <span>{post.readingTime} min read</span>
          <span>&middot;</span>
          <span>{post.wordCount} words</span>
        </div>

        {/* Title — cipher decode effect */}
        <h2 className="text-lg font-mono font-bold text-terminal-green group-hover:text-terminal-green-dim transition-colors mb-2">
          {cipherTitle}
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
