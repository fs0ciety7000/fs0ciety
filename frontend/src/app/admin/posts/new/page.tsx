"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagInput } from "@/components/admin/TagInput";

// ── Post templates ──────────────────────────────────────
const TEMPLATES: { label: string; icon: string; description: string; content: string; tags: string[] }[] = [
  {
    label: "Article",
    icon: ">>",
    description: "Standard blog post",
    tags: [],
    content: `# Title

Write your introduction here — set the context, hook the reader.

## Background

Provide relevant background information.

## Analysis

Your main points and arguments.

## Conclusion

Wrap up with key takeaways.
`,
  },
  {
    label: "Tutorial",
    icon: "~/",
    description: "Step-by-step guide",
    tags: ["tutorial"],
    content: `# Tutorial Title

Brief description of what the reader will learn.

## Prerequisites

- Prerequisite 1
- Prerequisite 2

## Step 1: Setup

Explain the initial setup.

\`\`\`bash
# commands here
\`\`\`

## Step 2: Implementation

Walk through the implementation.

\`\`\`
// code here
\`\`\`

## Step 3: Verification

How to verify it works.

## Troubleshooting

Common issues and solutions.

- [ ] Checkpoint: everything working?
`,
  },
  {
    label: "Journal",
    icon: "~$",
    description: "Personal log / writeup",
    tags: ["journal"],
    content: `# Entry Title

> tl;dr — one sentence summary.

---

Write freely here. What happened, what you learned, what you think.

## Key Takeaways

- Takeaway 1
- Takeaway 2
`,
  },
  {
    label: "Writeup",
    icon: "0x",
    description: "CTF / security writeup",
    tags: ["security", "writeup"],
    content: `# Challenge Name

| Field | Value |
| :--- | :--- |
| Category | Web / Pwn / Crypto / Rev |
| Difficulty | Easy / Medium / Hard |
| Points | 000 |

## Recon

Initial reconnaissance and enumeration.

\`\`\`bash
$ nmap -sV target
\`\`\`

## Vulnerability

Description of the vulnerability found.

## Exploit

Step-by-step exploitation.

\`\`\`python
# exploit code
\`\`\`

[terminal]
$ python exploit.py
[OK] Shell obtained
[/terminal]

## Flag

\`\`\`
flag{redacted}
\`\`\`

## Lessons Learned

What this challenge taught.
`,
  },
];

// ── Draft auto-save ─────────────────────────────────────
const DRAFT_KEY = "fs0ciety_draft_new";

interface DraftData {
  title: string;
  slug: string;
  content: string;
  tags: string[];
  published: boolean;
  category: string;
  seriesName: string;
  seriesOrder: string;
  savedAt: number;
}

function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraft(data: Omit<DraftData, "savedAt">) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // localStorage full or unavailable
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

// ── Component ───────────────────────────────────────────

export default function NewPostPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"standard" | "quick">("standard");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [category, setCategory] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [seriesOrder, setSeriesOrder] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(true);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setTitle(draft.title);
      setSlug(draft.slug);
      setContent(draft.content);
      setTags(draft.tags);
      setPublished(draft.published);
      setCategory(draft.category || "");
      setSeriesName(draft.seriesName || "");
      setSeriesOrder(draft.seriesOrder || "");
      setDraftLoaded(true);
      setAutoSlug(!draft.slug);
      const ago = Math.round((Date.now() - draft.savedAt) / 1000);
      const label = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.round(ago / 60)}m ago` : `${Math.round(ago / 3600)}h ago`;
      setDraftStatus(`Draft restored (saved ${label})`);
      setTimeout(() => setDraftStatus(null), 4000);
    }
  }, []);

  // Auto-save every 30s
  const doSave = useCallback(() => {
    if (!title && !content) return;
    saveDraft({ title, slug, content, tags, published, category, seriesName, seriesOrder });
    setDraftStatus("Draft saved");
    setTimeout(() => setDraftStatus(null), 2000);
  }, [title, slug, content, tags, published, category, seriesName, seriesOrder]);

  useEffect(() => {
    const interval = setInterval(doSave, 30000);
    return () => clearInterval(interval);
  }, [doSave]);

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (autoSlug) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setAutoSlug(false);
    setSlug(value);
  }

  function applyTemplate(template: typeof TEMPLATES[number]) {
    setContent(template.content);
    if (template.tags.length > 0) {
      setTags((prev) => [...new Set([...prev, ...template.tags])]);
    }
  }

  // Quick post: convert plain text into basic markdown
  function quickPostContent(plainText: string): string {
    const lines = plainText.split("\n");
    const result: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Auto-detect URLs and convert to links
      const withLinks = trimmed.replace(
        /(https?:\/\/[^\s]+)/g,
        (url) => `[${new URL(url).hostname}](${url})`
      );
      result.push(withLinks);
    }
    return result.join("\n");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.");
      return;
    }

    setSaving(true);
    setError(null);
    const token = localStorage.getItem("fs0ciety_token") || undefined;

    const finalContent = mode === "quick" ? quickPostContent(content) : content;

    // Build payload — include series metadata in frontmatter-style header if set
    let payload = finalContent;
    if (seriesName.trim()) {
      const seriesMeta = `<!-- series: ${seriesName.trim()} | order: ${seriesOrder || "1"} -->\n\n`;
      payload = seriesMeta + payload;
    }

    // Include category as a tag if set
    const finalTags = category.trim()
      ? [...new Set([...tags, category.trim().toLowerCase()])]
      : tags;

    try {
      await api.admin.createPost(
        { title, slug, content: payload, tags: finalTags, published },
        token
      );
      clearDraft();
      router.push("/admin/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-mono font-bold text-terminal-green mb-1">
          New Post
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-sm font-mono text-terminal-green-dim opacity-60">
            Create a new blog post
          </p>
          {draftStatus && (
            <span className="text-xs font-mono text-terminal-amber animate-pulse">
              {draftStatus}
            </span>
          )}
          {draftLoaded && (
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setTitle(""); setSlug(""); setContent(""); setTags([]);
                setPublished(false); setCategory(""); setSeriesName("");
                setSeriesOrder(""); setAutoSlug(true); setDraftLoaded(false);
              }}
              className="text-xs font-mono text-terminal-red-dim hover:text-terminal-red transition-colors"
            >
              Discard draft
            </button>
          )}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-xs font-mono text-terminal-green-dim uppercase tracking-wider">Mode:</span>
        <button
          type="button"
          onClick={() => setMode("standard")}
          className={`text-xs font-mono px-3 py-1.5 border transition-colors ${
            mode === "standard"
              ? "border-terminal-green text-terminal-green bg-terminal-green/10"
              : "border-terminal-gray-light text-terminal-green-dim hover:border-terminal-green/30"
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`text-xs font-mono px-3 py-1.5 border transition-colors ${
            mode === "quick"
              ? "border-terminal-green text-terminal-green bg-terminal-green/10"
              : "border-terminal-gray-light text-terminal-green-dim hover:border-terminal-green/30"
          }`}
        >
          Quick Post
        </button>
      </div>

      {/* Templates (standard mode only) */}
      {mode === "standard" && (
        <div className="mb-6">
          <span className="text-xs font-mono text-terminal-green-dim uppercase tracking-wider block mb-2">
            Templates
          </span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => applyTemplate(t)}
                title={t.description}
                className="group flex items-center gap-2 border border-terminal-gray-light text-terminal-green-dim font-mono text-xs px-3 py-2 hover:border-terminal-green/40 hover:text-terminal-green hover:bg-terminal-green/5 transition-colors"
              >
                <span className="text-terminal-amber opacity-70 group-hover:opacity-100">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {error && (
          <div className="border border-terminal-red/30 bg-terminal-red/5 px-4 py-3 text-sm font-mono text-terminal-red">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-mono text-terminal-green-dim mb-2 uppercase tracking-wider">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full bg-transparent border border-terminal-gray-light text-terminal-green font-mono px-4 py-3 text-lg outline-none focus:border-terminal-green/50 placeholder:text-terminal-green-dim/30"
            placeholder="Post title"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs font-mono text-terminal-green-dim mb-2 uppercase tracking-wider">
            Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-terminal-green-dim">
              /blog/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="flex-1 bg-transparent border border-terminal-gray-light text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/50 placeholder:text-terminal-green-dim/30"
              placeholder="post-slug"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-mono text-terminal-green-dim mb-2 uppercase tracking-wider">
            Tags
          </label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-mono text-terminal-green-dim mb-2 uppercase tracking-wider">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-terminal-black-light border border-terminal-gray-light text-terminal-green font-mono text-sm px-3 py-2 outline-none focus:border-terminal-green/50"
          >
            <option value="">None</option>
            <option value="security">Security</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="programming">Programming</option>
            <option value="writeup">Writeup</option>
            <option value="journal">Journal</option>
            <option value="tutorial">Tutorial</option>
          </select>
        </div>

        {/* Series (standard mode only) */}
        {mode === "standard" && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-mono text-terminal-green-dim mb-2 uppercase tracking-wider">
                Series Name <span className="opacity-40">(optional)</span>
              </label>
              <input
                type="text"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                className="w-full bg-transparent border border-terminal-gray-light text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/50 placeholder:text-terminal-green-dim/30"
                placeholder="e.g. Linux Hardening Series"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-mono text-terminal-green-dim mb-2 uppercase tracking-wider">
                Part #
              </label>
              <input
                type="number"
                min="1"
                value={seriesOrder}
                onChange={(e) => setSeriesOrder(e.target.value)}
                className="w-full bg-transparent border border-terminal-gray-light text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/50 placeholder:text-terminal-green-dim/30"
                placeholder="1"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div>
          <label className="block text-xs font-mono text-terminal-green-dim mb-2 uppercase tracking-wider">
            Content
          </label>
          {mode === "quick" ? (
            <div className="border border-terminal-gray-light bg-terminal-black-light">
              <div className="px-4 py-2 border-b border-terminal-gray-light">
                <span className="text-xs font-mono text-terminal-green-dim opacity-50">
                  Quick mode — just type. URLs auto-convert to links.
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Just start writing..."
                spellCheck={false}
                className="w-full min-h-[400px] bg-transparent text-[#d4d4d4] font-mono text-sm p-4 outline-none resize-y placeholder:text-terminal-green-dim/30"
              />
            </div>
          ) : (
            <MarkdownEditor value={content} onChange={setContent} />
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-terminal-gray-light">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="accent-[#00FF41] w-4 h-4"
            />
            <span className="text-sm font-mono text-terminal-green-dim">
              Publish immediately
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { doSave(); }}
              className="border border-terminal-amber/30 text-terminal-amber font-mono text-sm px-4 py-2 hover:border-terminal-amber/50 hover:bg-terminal-amber/5 transition-colors"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-terminal-gray-light text-terminal-green-dim font-mono text-sm px-4 py-2 hover:border-terminal-green/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="border border-terminal-green text-terminal-green font-mono text-sm px-6 py-2 hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Post"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
