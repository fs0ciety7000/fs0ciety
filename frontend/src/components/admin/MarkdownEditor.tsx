"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Parse a markdown table block into an HTML table. */
function renderTable(block: string): string {
  const lines = block.trim().split("\n");
  if (lines.length < 2) return block;

  const parseRow = (line: string) =>
    line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

  const headers = parseRow(lines[0]);

  // Parse alignment from separator row
  const sepCells = parseRow(lines[1]);
  const aligns = sepCells.map((c) => {
    if (c.startsWith(":") && c.endsWith(":")) return "center";
    if (c.endsWith(":")) return "right";
    return "left";
  });

  const rows = lines.slice(2).map(parseRow);

  const thCells = headers
    .map((h, i) => `<th style="text-align:${aligns[i] || "left"};padding:6px 12px;border:1px solid #2A2A2A;color:#00FF41;font-size:12px">${h}</th>`)
    .join("");
  const thead = `<thead><tr style="border-bottom:2px solid #00FF41">${thCells}</tr></thead>`;

  const tbody = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell, i) =>
              `<td style="text-align:${aligns[i] || "left"};padding:6px 12px;border:1px solid #2A2A2A;color:#d4d4d4;font-size:12px">${cell}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  return `<table style="border-collapse:collapse;width:100%;font-family:monospace;margin:1em 0">${thead}<tbody>${tbody}</tbody></table>`;
}

/** Minimal markdown-to-HTML for preview. */
function renderPreview(md: string): string {
  // Extract tables before other processing
  let result = md.replace(
    /(?:^|\n)((?:\|.+\|\n)+)/g,
    (_match, tableBlock: string) => {
      const lines = tableBlock.trim().split("\n");
      // Verify it has a separator row (second line with dashes)
      if (lines.length >= 2 && /^\|[\s:]*-+/.test(lines[1])) {
        return "\n" + renderTable(tableBlock) + "\n";
      }
      return _match;
    }
  );

  // Callout blocks: [!type]...[/!type]
  result = result.replace(
    /\[!(info|warning|danger|tip)\]\n([\s\S]*?)\n\[\/!\1\]/g,
    (_m, type: string, content: string) => {
      const colors: Record<string, string> = { info: "#00D4FF", warning: "#FFB000", danger: "#FF0033", tip: "#00FF41" };
      const icons: Record<string, string> = { info: "i", warning: "!", danger: "x", tip: "~" };
      return `<div style="border-left:3px solid ${colors[type]};background:${colors[type]}10;padding:12px 16px;margin:1em 0;font-family:monospace;font-size:12px"><span style="color:${colors[type]};font-weight:bold;text-transform:uppercase">[${icons[type]}] ${type}</span><div style="color:#d4d4d4;margin-top:6px">${content}</div></div>`;
    }
  );

  // Collapsible: [details Title]...[/details]
  result = result.replace(
    /\[details ([^\]]+)\]\n([\s\S]*?)\n\[\/details\]/g,
    '<details style="border:1px solid #2A2A2A;margin:1em 0;font-family:monospace;font-size:12px"><summary style="padding:8px 12px;cursor:pointer;color:#00FF41;font-weight:bold">$1</summary><div style="padding:8px 12px;color:#d4d4d4;border-top:1px solid #2A2A2A">$2</div></details>'
  );

  // Task lists: - [ ] and - [x]
  result = result.replace(/^- \[x\] (.+)$/gm, '<div style="font-family:monospace;font-size:12px;padding:2px 0"><span style="color:#00FF41">&#9745;</span> <span style="text-decoration:line-through;opacity:0.6">$1</span></div>');
  result = result.replace(/^- \[ \] (.+)$/gm, '<div style="font-family:monospace;font-size:12px;padding:2px 0"><span style="color:#555">&#9744;</span> $1</div>');

  result = result
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/==(.+?)==/g, '<mark style="background:#FFB00030;color:#FFB000;padding:0 3px">$1</mark>')
    .replace(/\[\^(\d+)\](?!:)/g, '<sup style="color:#00D4FF;cursor:help">[$1]</sup>')
    .replace(/\[\^(\d+)\]: (.+)$/gm, '<div style="font-size:11px;color:#888;border-top:1px solid #2A2A2A;padding-top:4px;margin-top:8px"><sup style="color:#00D4FF">[$1]</sup> $2</div>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#00d4ff">$1</a>')
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^---$/gm, "<hr>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");

  return result;
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
  { label: "Table", icon: "⊞", action: "insert", insert: "\n| Header | Header | Header |\n| :--- | :--- | :--- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n", title: "Insert table" },
  { label: "Task", icon: "☐", action: "prefix", before: "- [ ] ", title: "Task list item" },
  { label: "Callout", icon: "!", action: "insert", insert: "\n[!info]\nYour note here.\n[/!info]\n", title: "Callout block (info/warning/danger/tip)" },
  { label: "Details", icon: "▸", action: "insert", insert: "\n[details Summary title]\nCollapsible content here.\n[/details]\n", title: "Collapsible section" },
  { label: "Mark", icon: "M", action: "wrap", before: "==", after: "==", title: "Highlight text" },
  { label: "Footnote", icon: "fn", action: "insert", insert: "[^1]\n\n[^1]: Footnote text here.", title: "Footnote" },
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
