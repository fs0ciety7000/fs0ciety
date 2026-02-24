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
    // Ordered lists: 1. 2. 3.
    .replace(/^\d+\. (.+)$/gm, '<li style="list-style:decimal;margin-left:1.5em">$1</li>')
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
  separator?: boolean;
}

const TOOLBAR: ToolbarAction[] = [
  { label: "Bold", icon: "B", action: "wrap", before: "**", after: "**", title: "Bold (Ctrl+B)" },
  { label: "Italic", icon: "I", action: "wrap", before: "*", after: "*", title: "Italic (Ctrl+I)" },
  { label: "Strike", icon: "S", action: "wrap", before: "~~", after: "~~", title: "Strikethrough" },
  { label: "H1", icon: "H1", action: "prefix", before: "# ", title: "Heading 1 (Ctrl+1)", separator: true },
  { label: "H2", icon: "H2", action: "prefix", before: "## ", title: "Heading 2 (Ctrl+2)" },
  { label: "H3", icon: "H3", action: "prefix", before: "### ", title: "Heading 3 (Ctrl+3)" },
  { label: "Code", icon: "`", action: "wrap", before: "`", after: "`", title: "Inline code (Ctrl+E)", separator: true },
  { label: "CodeBlock", icon: "```", action: "insert", insert: "\n```\n\n```\n", title: "Code block (Ctrl+Shift+E)" },
  { label: "Quote", icon: ">", action: "prefix", before: "> ", title: "Blockquote (Ctrl+Shift+Q)" },
  { label: "List", icon: "\u2022", action: "prefix", before: "- ", title: "Bullet list" },
  { label: "NumList", icon: "1.", action: "prefix", before: "1. ", title: "Numbered list" },
  { label: "Link", icon: "\uD83D\uDD17", action: "insert", insert: "[text](url)", title: "Link (Ctrl+K)" },
  { label: "Image", icon: "\uD83D\uDCF7", action: "upload", title: "Upload image", separator: true },
  { label: "Table", icon: "\u229E", action: "insert", insert: "\n| Header | Header | Header |\n| :--- | :--- | :--- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n", title: "Insert table" },
  { label: "Task", icon: "\u2610", action: "prefix", before: "- [ ] ", title: "Task list item" },
  { label: "Callout", icon: "!", action: "insert", insert: "\n[!info]\nYour note here.\n[/!info]\n", title: "Callout block (info/warning/danger/tip)" },
  { label: "Details", icon: "\u25B8", action: "insert", insert: "\n[details Summary title]\nCollapsible content here.\n[/details]\n", title: "Collapsible section" },
  { label: "Mark", icon: "M", action: "wrap", before: "==", after: "==", title: "Highlight text", separator: true },
  { label: "Footnote", icon: "fn", action: "insert", insert: "[^1]\n\n[^1]: Footnote text here.", title: "Footnote" },
  { label: "HR", icon: "\u2014", action: "insert", insert: "\n---\n", title: "Horizontal rule" },
  { label: "PGP", icon: "PGP", action: "pgp", title: "Encrypt selection with PGP" },
  { label: "Redact", icon: "\u2588", action: "redact", title: "Redact selected text" },
];

// ── Cheat Sheet ─────────────────────────────────────────
const CHEAT_SHEET: { category: string; items: { syntax: string; result: string }[] }[] = [
  {
    category: "Text",
    items: [
      { syntax: "**bold**", result: "Bold text" },
      { syntax: "*italic*", result: "Italic text" },
      { syntax: "~~strike~~", result: "Strikethrough" },
      { syntax: "==highlight==", result: "Highlighted text" },
      { syntax: "`code`", result: "Inline code" },
    ],
  },
  {
    category: "Headings",
    items: [
      { syntax: "# H1", result: "Heading 1" },
      { syntax: "## H2", result: "Heading 2" },
      { syntax: "### H3", result: "Heading 3" },
    ],
  },
  {
    category: "Lists",
    items: [
      { syntax: "- item", result: "Bullet list" },
      { syntax: "1. item", result: "Numbered list" },
      { syntax: "- [ ] task", result: "Unchecked task" },
      { syntax: "- [x] task", result: "Checked task" },
    ],
  },
  {
    category: "Blocks",
    items: [
      { syntax: "> quote", result: "Blockquote" },
      { syntax: "```lang\\n...\\n```", result: "Code block" },
      { syntax: "---", result: "Horizontal rule" },
      { syntax: "[!info]...[/!info]", result: "Callout (info/warning/danger/tip)" },
      { syntax: "[details Title]...[/details]", result: "Collapsible section" },
      { syntax: "[terminal]...[/terminal]", result: "Terminal output" },
    ],
  },
  {
    category: "Links & Media",
    items: [
      { syntax: "[text](url)", result: "Link" },
      { syntax: "![alt](url)", result: "Image" },
      { syntax: "[^1] + [^1]: note", result: "Footnote" },
    ],
  },
  {
    category: "Tables",
    items: [
      { syntax: "| H1 | H2 |", result: "Table header" },
      { syntax: "| :--- | ---: |", result: "Alignment (left/right)" },
      { syntax: "| cell | cell |", result: "Table data" },
    ],
  },
  {
    category: "Special",
    items: [
      { syntax: "[redact]...[/redact]", result: "Redacted text" },
      { syntax: "[pgp-encrypted]...[/pgp-encrypted]", result: "PGP block" },
    ],
  },
  {
    category: "Shortcuts",
    items: [
      { syntax: "Ctrl+B", result: "Bold" },
      { syntax: "Ctrl+I", result: "Italic" },
      { syntax: "Ctrl+K", result: "Link" },
      { syntax: "Ctrl+E", result: "Inline code" },
      { syntax: "Ctrl+Shift+E", result: "Code block" },
      { syntax: "Ctrl+1/2/3", result: "Heading 1/2/3" },
      { syntax: "Ctrl+Shift+Q", result: "Blockquote" },
      { syntax: "Tab", result: "Insert 2 spaces" },
    ],
  },
];

// ── Auto-format pasted text ─────────────────────────────
function autoFormatPastedText(text: string): string {
  let result = text;

  // Convert bare URLs to markdown links
  result = result.replace(
    /(?<!\[.*?\]\()(?<!\()(https?:\/\/[^\s)]+)/g,
    (url) => {
      try {
        const hostname = new URL(url).hostname;
        return `[${hostname}](${url})`;
      } catch {
        return url;
      }
    }
  );

  // Convert lines that look like numbered lists (1) or 1.)
  result = result.replace(/^(\d+)[.)]\s+/gm, "$1. ");

  // Convert lines starting with bullet chars (*, •, -, –)
  result = result.replace(/^[*\u2022\u2013\u2014]\s+/gm, "- ");

  return result;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your post in Markdown...",
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<"write" | "preview" | "split">("write");
  const [uploading, setUploading] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const splitTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = value.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 238));

  // Use the appropriate textarea ref based on view mode
  function getActiveTextarea(): HTMLTextAreaElement | null {
    return viewMode === "split" ? splitTextareaRef.current : textareaRef.current;
  }

  function wrapSelection(before: string, after: string) {
    const ta = getActiveTextarea();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end) || "text";
    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + selected.length;
    });
  }

  function prefixLine(prefix: string) {
    const ta = getActiveTextarea();
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + prefix.length;
    });
  }

  function insertText(text: string) {
    const ta = getActiveTextarea();
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
    const ta = getActiveTextarea();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.substring(start, end);
    if (!selected.trim()) {
      alert("Select text to encrypt first.");
      return;
    }
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
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl) {
      // Bold
      if (e.key === "b") { e.preventDefault(); wrapSelection("**", "**"); }
      // Italic
      if (e.key === "i") { e.preventDefault(); wrapSelection("*", "*"); }
      // Link
      if (e.key === "k") { e.preventDefault(); insertText("[text](url)"); }
      // Inline code
      if (e.key === "e" && !e.shiftKey) { e.preventDefault(); wrapSelection("`", "`"); }
      // Code block
      if (e.key === "e" && e.shiftKey) { e.preventDefault(); insertText("\n```\n\n```\n"); }
      // Headings: Ctrl+1, Ctrl+2, Ctrl+3
      if (e.key === "1") { e.preventDefault(); prefixLine("# "); }
      if (e.key === "2") { e.preventDefault(); prefixLine("## "); }
      if (e.key === "3") { e.preventDefault(); prefixLine("### "); }
      // Blockquote
      if (e.key === "q" && e.shiftKey) { e.preventDefault(); prefixLine("> "); }
    }
    // Tab inserts 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      insertText("  ");
    }
  }

  async function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    // Handle image paste
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleUpload(file);
        return;
      }
    }
    // Handle text paste with auto-formatting
    const text = e.clipboardData.getData("text/plain");
    if (text) {
      const formatted = autoFormatPastedText(text);
      if (formatted !== text) {
        e.preventDefault();
        insertText(formatted);
      }
    }
  }

  const previewContent = (
    <div className="prose-fs0ciety">
      {value.trim() ? (
        <div dangerouslySetInnerHTML={{ __html: renderPreview(value) }} />
      ) : (
        <div className="text-sm font-mono text-terminal-green-dim opacity-50">
          Nothing to preview.
        </div>
      )}
    </div>
  );

  const textareaElement = (ref: React.RefObject<HTMLTextAreaElement | null>) => (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      spellCheck={false}
      className="w-full h-full min-h-[500px] bg-transparent text-[#d4d4d4] font-mono text-sm p-4 outline-none resize-y placeholder:text-terminal-green-dim/30"
    />
  );

  return (
    <div className="border border-terminal-gray-light bg-terminal-black-light">
      {/* Top bar: tabs + word count */}
      <div className="flex items-center justify-between border-b border-terminal-gray-light px-4 py-2">
        <div className="flex gap-2">
          {(["write", "split", "preview"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setViewMode(m)}
              className={cn(
                "text-xs font-mono px-3 py-1 transition-colors",
                viewMode === m
                  ? "text-terminal-green bg-terminal-green/10"
                  : "text-terminal-green-dim hover:text-terminal-green"
              )}
            >
              {m === "write" ? "Write" : m === "split" ? "Split" : "Preview"}
            </button>
          ))}
          <div className="w-px bg-terminal-gray-light mx-1" />
          <button
            type="button"
            onClick={() => setShowCheatSheet(!showCheatSheet)}
            className={cn(
              "text-xs font-mono px-2 py-1 transition-colors",
              showCheatSheet
                ? "text-terminal-amber bg-terminal-amber/10"
                : "text-terminal-green-dim hover:text-terminal-amber"
            )}
            title="Syntax cheat sheet"
          >
            ?
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-terminal-green-dim opacity-50">
          {uploading && <span className="text-terminal-amber animate-pulse">Uploading...</span>}
          <span>{wordCount} words &middot; {readingTime} min read</span>
        </div>
      </div>

      {/* Cheat Sheet Panel */}
      {showCheatSheet && (
        <div className="border-b border-terminal-gray-light bg-terminal-black/80 px-4 py-3 max-h-[300px] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {CHEAT_SHEET.map((group) => (
              <div key={group.category}>
                <h4 className="text-xs font-mono text-terminal-amber font-bold mb-1.5 uppercase tracking-wider">
                  {group.category}
                </h4>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <div key={item.syntax} className="flex items-baseline gap-2 text-[10px] font-mono">
                      <code className="text-terminal-green shrink-0">{item.syntax}</code>
                      <span className="text-terminal-green-dim opacity-50">{item.result}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formatting toolbar (not in pure preview mode) */}
      {viewMode !== "preview" && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-terminal-gray-light bg-terminal-black/50">
          {TOOLBAR.map((tool, i) => (
            <span key={i} className="contents">
              {tool.separator && i > 0 && (
                <div className="w-px h-4 bg-terminal-gray-light mx-0.5" />
              )}
              <button
                type="button"
                onClick={() => handleToolbarClick(tool)}
                title={tool.title}
                className="px-2 py-1 text-xs font-mono text-terminal-green-dim hover:text-terminal-green hover:bg-terminal-green/10 transition-colors rounded"
              >
                {tool.icon}
              </button>
            </span>
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

      {/* Editor / Preview / Split */}
      {viewMode === "write" ? (
        textareaElement(textareaRef)
      ) : viewMode === "preview" ? (
        <div className="min-h-[500px] p-4">
          {previewContent}
        </div>
      ) : (
        /* Split view */
        <div className="flex min-h-[500px]">
          <div className="w-1/2 border-r border-terminal-gray-light">
            {textareaElement(splitTextareaRef)}
          </div>
          <div className="w-1/2 p-4 overflow-y-auto">
            {previewContent}
          </div>
        </div>
      )}
    </div>
  );
}
