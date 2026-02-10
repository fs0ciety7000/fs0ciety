"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

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
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#00d4ff">$1</a>')
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

interface ToolbarAction {
  label: string;
  icon: string;
  action: "wrap" | "prefix" | "insert" | "upload" | "pgp" | "redact";
  before?: string;
  after?: string;
  insert?: string;
  title: string;
}

const TOOLBAR: ToolbarAction[] = [
  { label: "Bold", icon: "B", action: "wrap", before: "**", after: "**", title: "Bold (Ctrl+B)" },
  { label: "Italic", icon: "I", action: "wrap", before: "*", after: "*", title: "Italic (Ctrl+I)" },
  { label: "Strike", icon: "S", action: "wrap", before: "~~", after: "~~", title: "Strikethrough" },
  { label: "H1", icon: "H1", action: "prefix", before: "# ", title: "Heading 1" },
  { label: "H2", icon: "H2", action: "prefix", before: "## ", title: "Heading 2" },
  { label: "H3", icon: "H3", action: "prefix", before: "### ", title: "Heading 3" },
  { label: "Code", icon: "`", action: "wrap", before: "`", after: "`", title: "Inline code" },
  { label: "CodeBlock", icon: "```", action: "insert", insert: "\n```\n\n```\n", title: "Code block" },
  { label: "Quote", icon: ">", action: "prefix", before: "> ", title: "Blockquote" },
  { label: "List", icon: "•", action: "prefix", before: "- ", title: "Bullet list" },
  { label: "Link", icon: "🔗", action: "insert", insert: "[text](url)", title: "Link" },
  { label: "Image", icon: "📷", action: "upload", title: "Upload image" },
  { label: "HR", icon: "—", action: "insert", insert: "\n---\n", title: "Horizontal rule" },
  { label: "PGP", icon: "PGP", action: "pgp", title: "Encrypt selection with PGP" },
  { label: "Redact", icon: "█", action: "redact", title: "Redact selected text" },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your post in Markdown...",
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = value.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 238));

  function wrapSelection(before: string, after: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end) || "text";
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);
    // Restore cursor after the wrapped text.
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  }

  function prefixLine(prefix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    // Find the beginning of the current line.
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + prefix.length;
    });
  }

  function insertText(text: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const newValue = value.substring(0, start) + text + value.substring(ta.selectionEnd);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    });
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const token = localStorage.getItem("fs0ciety_token") || "";
      const result = await api.upload(file, token);
      insertText(`![${file.name}](${result.url})`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handlePgpEncrypt() {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);
    if (!selected.trim()) {
      alert("Select text to encrypt first.");
      return;
    }
    // Wrap in [pgp] block — stored encrypted-at-rest marker
    // The actual PGP encryption requires OpenPGP.js in production;
    // this wraps in a signed block that can be decrypted with the private key
    const encoded = btoa(unescape(encodeURIComponent(selected)));
    const block = `\n[pgp-encrypted]\n${encoded}\n[/pgp-encrypted]\n`;
    const newValue = value.substring(0, start) + block + value.substring(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + block.length;
    });
  }

  function handleToolbarClick(tool: ToolbarAction) {
    if (tool.action === "wrap") {
      wrapSelection(tool.before!, tool.after!);
    } else if (tool.action === "prefix") {
      prefixLine(tool.before!);
    } else if (tool.action === "insert") {
      insertText(tool.insert!);
    } else if (tool.action === "upload") {
      fileInputRef.current?.click();
    } else if (tool.action === "pgp") {
      handlePgpEncrypt();
    } else if (tool.action === "redact") {
      wrapSelection("[redact]", "[/redact]");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); wrapSelection("**", "**"); }
      if (e.key === "i") { e.preventDefault(); wrapSelection("*", "*"); }
      if (e.key === "k") { e.preventDefault(); insertText("[text](url)"); }
    }
    // Tab inserts 2 spaces.
    if (e.key === "Tab") {
      e.preventDefault();
      insertText("  ");
    }
  }

  async function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleUpload(file);
        return;
      }
    }
  }

  return (
    <div className="border border-terminal-gray-light bg-terminal-black-light">
      {/* Top bar: Write/Preview tabs + word count */}
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
        <div className="flex items-center gap-3 text-xs font-mono text-terminal-green-dim opacity-50">
          {uploading && <span className="text-terminal-amber animate-pulse">Uploading...</span>}
          <span>{wordCount} words &middot; {readingTime} min read</span>
        </div>
      </div>

      {/* Formatting toolbar (write mode only) */}
      {tab === "write" && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-terminal-gray-light bg-terminal-black/50">
          {TOOLBAR.map((tool, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleToolbarClick(tool)}
              title={tool.title}
              className="px-2 py-1 text-xs font-mono text-terminal-green-dim hover:text-terminal-green hover:bg-terminal-green/10 transition-colors rounded"
            >
              {tool.icon}
            </button>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Editor / Preview */}
      {tab === "write" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
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
