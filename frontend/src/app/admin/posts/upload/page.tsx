"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PostPayload } from "@/types";

/* ── Frontmatter parser ────────────────────────────────────── */

interface ParsedMdx {
  file: string;
  payload: PostPayload;
  raw: string;
}

function parseFrontmatter(text: string): { meta: Record<string, string>; content: string } {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") return { meta: {}, content: text };

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return { meta: {}, content: text };

  const meta: Record<string, string> = {};
  for (let i = 1; i < endIdx; i++) {
    const match = lines[i]?.match(/^(\w+):\s*(.*)$/);
    if (match) meta[match[1]] = match[2];
  }
  const content = lines.slice(endIdx + 1).join("\n").replace(/^\n+/, "");
  return { meta, content };
}

function parseTags(raw: string): string[] {
  const stripped = raw.replace(/^\[/, "").replace(/]$/, "");
  return stripped
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function parseMdxFile(filename: string, text: string): ParsedMdx {
  const { meta, content } = parseFrontmatter(text);
  const slug =
    meta.slug ||
    filename
      .replace(/\.mdx?$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
  return {
    file: filename,
    raw: text,
    payload: {
      title: meta.title || slug,
      slug,
      content,
      tags: meta.tags ? parseTags(meta.tags) : [],
      published: meta.published === "true",
    },
  };
}

/* ── Upload result types ───────────────────────────────────── */

type FileStatus = "pending" | "publishing" | "created" | "updated" | "error";

interface UploadEntry extends ParsedMdx {
  status: FileStatus;
  error?: string;
}

/* ── Component ─────────────────────────────────────────────── */

export default function UploadMdxPage() {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Read files and parse them */
  const processFiles = useCallback((files: FileList | File[]) => {
    const mdxFiles = Array.from(files).filter(
      (f) => f.name.endsWith(".mdx") || f.name.endsWith(".md")
    );
    if (mdxFiles.length === 0) return;

    Promise.all(
      mdxFiles.map(
        (f) =>
          new Promise<UploadEntry>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const parsed = parseMdxFile(f.name, reader.result as string);
              resolve({ ...parsed, status: "pending" });
            };
            reader.readAsText(f);
          })
      )
    ).then((parsed) => {
      setEntries((prev) => {
        const slugs = new Set(prev.map((e) => e.payload.slug));
        const fresh = parsed.filter((p) => !slugs.has(p.payload.slug));
        return [...prev, ...fresh];
      });
    });
  }, []);

  /* Drag & drop handlers */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  /* Toggle published flag on a single entry */
  function togglePublished(slug: string) {
    setEntries((prev) =>
      prev.map((e) =>
        e.payload.slug === slug
          ? { ...e, payload: { ...e.payload, published: !e.payload.published } }
          : e
      )
    );
  }

  /* Remove a single entry */
  function removeEntry(slug: string) {
    setEntries((prev) => prev.filter((e) => e.payload.slug !== slug));
  }

  /* Publish all pending entries */
  async function publishAll() {
    const token = localStorage.getItem("fs0ciety_token") || undefined;
    setPublishing(true);

    for (const entry of entries) {
      if (entry.status === "created" || entry.status === "updated") continue;

      setEntries((prev) =>
        prev.map((e) =>
          e.payload.slug === entry.payload.slug ? { ...e, status: "publishing" } : e
        )
      );

      try {
        // Try update first, create if 404.
        try {
          await api.admin.updatePost(entry.payload.slug, entry.payload, token);
          setEntries((prev) =>
            prev.map((e) =>
              e.payload.slug === entry.payload.slug ? { ...e, status: "updated" } : e
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("404") || msg.includes("not found") || msg.includes("Not found")) {
            await api.admin.createPost(entry.payload, token);
            setEntries((prev) =>
              prev.map((e) =>
                e.payload.slug === entry.payload.slug ? { ...e, status: "created" } : e
              )
            );
          } else {
            throw err;
          }
        }
      } catch (err) {
        setEntries((prev) =>
          prev.map((e) =>
            e.payload.slug === entry.payload.slug
              ? { ...e, status: "error", error: err instanceof Error ? err.message : "Unknown error" }
              : e
          )
        );
      }
    }

    setPublishing(false);
  }

  const pending = entries.filter((e) => e.status === "pending" || e.status === "error");
  const done = entries.filter((e) => e.status === "created" || e.status === "updated");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-mono font-bold text-terminal-green mb-1">
            Upload MDX
          </h1>
          <p className="text-sm font-mono text-terminal-green-dim opacity-60">
            Drop .mdx files to parse and publish blog posts
          </p>
        </div>
        <Link
          href="/admin/posts"
          className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green transition-colors"
        >
          &larr; back to posts
        </Link>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed p-10 text-center cursor-pointer transition-colors mb-8 ${
          dragOver
            ? "border-terminal-green bg-terminal-green/5"
            : "border-terminal-gray-light hover:border-terminal-green/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".mdx,.md"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
        <div className="text-3xl font-mono text-terminal-green-dim mb-3 opacity-40">
          ^
        </div>
        <div className="text-sm font-mono text-terminal-green-dim">
          Drop <span className="text-terminal-green">.mdx</span> files here or click to browse
        </div>
        <div className="text-xs font-mono text-terminal-green-dim opacity-40 mt-2">
          Parses YAML frontmatter (title, slug, tags, published)
        </div>
      </div>

      {/* Parsed files table */}
      {entries.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-mono text-terminal-green-dim">
              {entries.length} file{entries.length !== 1 ? "s" : ""} parsed
              {done.length > 0 && (
                <span className="text-terminal-green ml-2">
                  ({done.length} deployed)
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEntries([])}
                className="text-xs font-mono text-terminal-red-dim hover:text-terminal-red transition-colors"
              >
                clear all
              </button>
              {pending.length > 0 && (
                <button
                  onClick={publishAll}
                  disabled={publishing}
                  className="border border-terminal-green text-terminal-green font-mono text-sm px-4 py-2 hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
                >
                  {publishing ? "Deploying..." : `Deploy ${pending.length} post${pending.length !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          </div>

          <div className="border border-terminal-gray-light bg-terminal-black-light">
            <table className="w-full">
              <thead>
                <tr className="border-b border-terminal-gray-light text-left">
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden sm:table-cell">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden md:table-cell">
                    Tags
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider">
                    Publish
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.payload.slug}
                    className="border-b border-terminal-gray-light last:border-0 hover:bg-terminal-green/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim">
                      {entry.file}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-terminal-green">
                      {entry.payload.title}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim hidden sm:table-cell">
                      /blog/{entry.payload.slug}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {entry.payload.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs font-mono px-1.5 py-0.5 border border-terminal-gray-light text-terminal-green-dim"
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.payload.tags.length > 3 && (
                          <span className="text-xs font-mono text-terminal-green-dim">
                            +{entry.payload.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePublished(entry.payload.slug)}
                        disabled={entry.status !== "pending" && entry.status !== "error"}
                        className="text-xs font-mono disabled:opacity-40"
                      >
                        {entry.payload.published ? (
                          <span className="text-terminal-green">LIVE</span>
                        ) : (
                          <span className="text-terminal-amber">DRAFT</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={entry.status} error={entry.error} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(entry.status === "pending" || entry.status === "error") && (
                        <button
                          onClick={() => removeEntry(entry.payload.slug)}
                          className="text-xs font-mono text-terminal-red-dim hover:text-terminal-red transition-colors"
                        >
                          remove
                        </button>
                      )}
                      {(entry.status === "created" || entry.status === "updated") && (
                        <Link
                          href={`/blog/${entry.payload.slug}`}
                          target="_blank"
                          className="text-xs font-mono text-terminal-cyan hover:text-terminal-green transition-colors"
                        >
                          view
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Status badge ──────────────────────────────────────────── */

function StatusBadge({ status, error }: { status: FileStatus; error?: string }) {
  switch (status) {
    case "pending":
      return (
        <span className="text-xs font-mono px-2 py-0.5 border border-terminal-gray-light text-terminal-green-dim">
          READY
        </span>
      );
    case "publishing":
      return (
        <span className="text-xs font-mono px-2 py-0.5 border border-terminal-cyan/30 text-terminal-cyan animate-pulse">
          DEPLOYING
        </span>
      );
    case "created":
      return (
        <span className="text-xs font-mono px-2 py-0.5 border border-terminal-green/30 text-terminal-green">
          CREATED
        </span>
      );
    case "updated":
      return (
        <span className="text-xs font-mono px-2 py-0.5 border border-terminal-green/30 text-terminal-green">
          UPDATED
        </span>
      );
    case "error":
      return (
        <span
          className="text-xs font-mono px-2 py-0.5 border border-terminal-red/30 text-terminal-red cursor-help"
          title={error}
        >
          ERROR
        </span>
      );
  }
}
