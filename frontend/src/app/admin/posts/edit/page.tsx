"use client";

import { Suspense, useEffect, useState, useCallback, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagInput } from "@/components/admin/TagInput";
import type { Post } from "@/types";

// ── Draft auto-save ─────────────────────────────────────
function draftKey(slug: string) {
  return `fs0ciety_draft_edit_${slug}`;
}

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

function loadDraft(slug: string): DraftData | null {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraft(slug: string, data: Omit<DraftData, "savedAt">) {
  try {
    localStorage.setItem(draftKey(slug), JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {}
}

function clearDraft(slug: string) {
  try {
    localStorage.removeItem(draftKey(slug));
  } catch {}
}

// ── Parse series info from content ──────────────────────
function parseSeriesFromContent(content: string): { seriesName: string; seriesOrder: string; cleanContent: string } {
  const match = content.match(/^<!--\s*series:\s*(.+?)\s*\|\s*order:\s*(\d+)\s*-->\n*/);
  if (match) {
    return {
      seriesName: match[1],
      seriesOrder: match[2],
      cleanContent: content.replace(/^<!--\s*series:.+?-->\n*/, ""),
    };
  }
  return { seriesName: "", seriesOrder: "", cleanContent: content };
}

function EditPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugParam = searchParams.get("slug");

  const [loading, setLoading] = useState(true);
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
  const [draftStatus, setDraftStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!slugParam) {
      setError("No slug specified.");
      setLoading(false);
      return;
    }

    // Check for saved draft first
    const draft = loadDraft(slugParam);
    if (draft) {
      setTitle(draft.title);
      setSlug(draft.slug);
      setContent(draft.content);
      setTags(draft.tags);
      setPublished(draft.published);
      setCategory(draft.category || "");
      setSeriesName(draft.seriesName || "");
      setSeriesOrder(draft.seriesOrder || "");
      setLoading(false);
      const ago = Math.round((Date.now() - draft.savedAt) / 1000);
      const label = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.round(ago / 60)}m ago` : `${Math.round(ago / 3600)}h ago`;
      setDraftStatus(`Draft restored (saved ${label})`);
      setTimeout(() => setDraftStatus(null), 4000);
      return;
    }

    const token = localStorage.getItem("fs0ciety_token") || undefined;
    api.admin
      .getPost(slugParam, token)
      .then((post: Post) => {
        setTitle(post.title);
        setSlug(post.slug);
        setTags(post.tags);
        setPublished(post.published);

        // Parse series info from content
        const { seriesName: sn, seriesOrder: so, cleanContent } = parseSeriesFromContent(post.content);
        setContent(cleanContent);
        setSeriesName(sn);
        setSeriesOrder(so);

        // Detect category from tags
        const categories = ["security", "infrastructure", "programming", "writeup", "journal", "tutorial"];
        const detectedCat = post.tags.find((t) => categories.includes(t));
        if (detectedCat) setCategory(detectedCat);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load post.");
      })
      .finally(() => setLoading(false));
  }, [slugParam]);

  // Auto-save every 30s
  const doSave = useCallback(() => {
    if (!slugParam || (!title && !content)) return;
    saveDraft(slugParam, { title, slug, content, tags, published, category, seriesName, seriesOrder });
    setDraftStatus("Draft saved");
    setTimeout(() => setDraftStatus(null), 2000);
  }, [slugParam, title, slug, content, tags, published, category, seriesName, seriesOrder]);

  useEffect(() => {
    const interval = setInterval(doSave, 30000);
    return () => clearInterval(interval);
  }, [doSave]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.");
      return;
    }

    setSaving(true);
    setError(null);
    const token = localStorage.getItem("fs0ciety_token") || undefined;

    // Build content with series metadata
    let payload = content;
    if (seriesName.trim()) {
      payload = `<!-- series: ${seriesName.trim()} | order: ${seriesOrder || "1"} -->\n\n${payload}`;
    }

    // Include category as tag
    const finalTags = category.trim()
      ? [...new Set([...tags, category.trim().toLowerCase()])]
      : tags;

    try {
      await api.admin.updatePost(
        slugParam!,
        { title, slug, content: payload, tags: finalTags, published },
        token
      );
      if (slugParam) clearDraft(slugParam);
      router.push("/admin/posts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
        Loading post...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-mono font-bold text-terminal-green mb-1">
          Edit Post
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-sm font-mono text-terminal-green-dim opacity-60">
            Editing: {slugParam}
          </p>
          {draftStatus && (
            <span className="text-xs font-mono text-terminal-amber animate-pulse">
              {draftStatus}
            </span>
          )}
        </div>
      </div>

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
            onChange={(e) => setTitle(e.target.value)}
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
              onChange={(e) => setSlug(e.target.value)}
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

        {/* Series */}
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

        {/* Content */}
        <div>
          <label className="block text-xs font-mono text-terminal-green-dim mb-2 uppercase tracking-wider">
            Content
          </label>
          <MarkdownEditor value={content} onChange={setContent} />
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
              Published
            </span>
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => doSave()}
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
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function EditPostPage() {
  return (
    <Suspense
      fallback={
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
          Loading...
        </div>
      }
    >
      <EditPostForm />
    </Suspense>
  );
}
