"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagInput } from "@/components/admin/TagInput";
import type { Post } from "@/types";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugParam) {
      setError("No slug specified.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("fs0ciety_token") || undefined;
    api.admin
      .getPost(slugParam, token)
      .then((post: Post) => {
        setTitle(post.title);
        setSlug(post.slug);
        setContent(post.content);
        setTags(post.tags);
        setPublished(post.published);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load post.");
      })
      .finally(() => setLoading(false));
  }, [slugParam]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.");
      return;
    }

    setSaving(true);
    setError(null);
    const token = localStorage.getItem("fs0ciety_token") || undefined;

    try {
      await api.admin.updatePost(
        slugParam!,
        { title, slug, content, tags, published },
        token
      );
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
        <p className="text-sm font-mono text-terminal-green-dim opacity-60">
          Editing: {slugParam}
        </p>
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
