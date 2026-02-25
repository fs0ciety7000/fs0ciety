"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  index?: number;
}

export function PostCard({ post, index = 0 }: PostCardProps) {
  const d = new Date(post.createdAt);
  const date = isNaN(d.getTime())
    ? "\u2014"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  const cipherTitle = useCipherReveal(post.title);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
      className="group spectr-post-card"
    >
      {/* Corner brackets (dark mode) */}
      <span className="spectr-bracket-tl" />
      <span className="spectr-bracket-br" />

      <Link href={`/blog/${post.slug}`} className="block p-6">
        {/* Classification + meta row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 spectr-caption">
            {post.author && (
              <>
                <span
                  className="hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ color: "var(--spectr-accent-secondary)" }}
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
                <span style={{ opacity: 0.2 }}>/</span>
              </>
            )}
            <time style={{ color: "var(--spectr-text-muted)" }}>{date}</time>
            <span style={{ opacity: 0.2 }}>/</span>
            <span style={{ color: "var(--spectr-text-muted)" }}>{post.readingTime}m read</span>
          </div>
          <span className="spectr-label" style={{ opacity: 0.3 }}>
            {post.wordCount.toLocaleString()}w
          </span>
        </div>

        {/* Title */}
        <h2 className="spectr-display text-lg mb-2 transition-colors" style={{ color: "var(--spectr-text-primary)" }}>
          {cipherTitle}
        </h2>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="spectr-body text-sm mb-4 line-clamp-2" style={{ color: "var(--spectr-text-secondary)", lineHeight: 1.6 }}>
            {post.excerpt}
          </p>
        )}

        {/* Series badge */}
        {post.series && (
          <div className="mb-3">
            <span
              className="spectr-caption inline-flex items-center gap-1"
              style={{ color: "var(--spectr-accent-tertiary)" }}
            >
              <span aria-hidden="true">&#9671;</span>
              {post.series}
              {post.seriesPart !== undefined && (
                <span style={{ color: "var(--spectr-text-muted)" }}>
                  &nbsp;&mdash; Part {post.seriesPart}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Tags + read indicator */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span key={tag} className="spectr-tag" style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem" }}>
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {typeof post.views === "number" && post.views > 0 && (
              <span className="spectr-caption" style={{ color: "var(--spectr-text-muted)" }}>
                {post.views.toLocaleString()} views
              </span>
            )}
            <span
              className="spectr-label opacity-0 group-hover:opacity-60 transition-opacity"
              style={{ color: "var(--spectr-accent-secondary)" }}
            >
              read &rarr;
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
