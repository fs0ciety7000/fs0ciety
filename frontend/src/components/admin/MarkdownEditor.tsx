"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Minimal markdown-to-HTML for preview. */
function renderPreview(md: string): string {
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your post in Markdown...",
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  const wordCount = value.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 238));

  return (
    <div className="border border-terminal-gray-light bg-terminal-black-light">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-terminal-gray-light px-4 py-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={cn(
              "text-xs font-mono px-3 py-1 transition-colors",
              tab === "write"
                ? "text-terminal-green bg-terminal-green/10"
                : "text-terminal-green-dim hover:text-terminal-green"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn(
              "text-xs font-mono px-3 py-1 transition-colors",
              tab === "preview"
                ? "text-terminal-green bg-terminal-green/10"
                : "text-terminal-green-dim hover:text-terminal-green"
            )}
          >
            Preview
          </button>
        </div>
        <div className="text-xs font-mono text-terminal-green-dim opacity-50">
          {wordCount} words &middot; {readingTime} min read
        </div>
      </div>

      {/* Editor / Preview */}
      {tab === "write" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full min-h-[500px] bg-transparent text-[#d4d4d4] font-mono text-sm p-4 outline-none resize-y placeholder:text-terminal-green-dim/30"
        />
      ) : (
        <div className="min-h-[500px] p-4 prose-fs0ciety">
          {value.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: renderPreview(value) }} />
          ) : (
            <div className="text-sm font-mono text-terminal-green-dim opacity-50">
              Nothing to preview.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
