"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Post } from "@/types";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { CipherLoading } from "@/components/blog/CipherText";

// ── Types ────────────────────────────────────────────────

interface TocEntry {
  level: number;
  text: string;
  id: string;
}

interface Props {
  initialPost: Post | null;
  slug: string;
}

// ── Component ────────────────────────────────────────────

export default function BlogPostClient({ initialPost, slug }: Props) {
  const [post, setPost] = useState<Post | null>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const [error, setError] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(true);

  // If no initial post (fallback), fetch client-side
  useEffect(() => {
    if (initialPost || !slug) return;
    fetch(`/api/posts/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Post not found");
        return r.json();
      })
      .then((data) => setPost(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, initialPost]);

  const { html, toc } = useMemo(() => {
    if (!post) return { html: "", toc: [] as TocEntry[] };
    return renderMarkdownWithToc(post.content);
  }, [post]);

  // Wire up copy-to-clipboard on code blocks
  useEffect(() => {
    if (!html) return;
    const buttons = document.querySelectorAll<HTMLButtonElement>(".code-copy-btn");
    function handler(this: HTMLButtonElement) {
      const code = this.getAttribute("data-code") || "";
      navigator.clipboard.writeText(code).then(() => {
        this.textContent = "Copied!";
        this.classList.add("copied");
        setTimeout(() => {
          this.textContent = "Copy";
          this.classList.remove("copied");
        }, 2000);
      });
    }
    buttons.forEach((btn) => btn.addEventListener("click", handler));
    return () => buttons.forEach((btn) => btn.removeEventListener("click", handler));
  }, [html]);

  if (loading) {
    return <CipherLoading text={`$ cat /var/log/thoughts/${slug}`} />;
  }

  if (error || !post) {
    return (
      <div>
        <div className="font-mono text-terminal-red text-sm mb-4">
          Error: {error || "Post not found"}
        </div>
        <Link
          href="/blog"
          className="text-xs font-mono text-terminal-cyan hover:text-terminal-green transition-colors"
        >
          &larr; back to posts
        </Link>
      </div>
    );
  }

  const d = new Date(post.createdAt);
  const date = isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <article>
      <ReadingProgress />

      {/* Back link */}
      <Link
        href="/blog"
        className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green transition-colors inline-block mb-8"
      >
        &larr; cd /blog
      </Link>

      {/* Post header */}
      <header className="mb-10 pb-6 border-b border-terminal-gray-light">
        <h1 className="text-2xl sm:text-3xl font-mono font-bold text-terminal-green mb-3">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#a3a3a3]">
          <time>{date}</time>
          <span className="text-terminal-gray-light">|</span>
          <a
            href={`/profile/${post.author}`}
            className="text-terminal-cyan hover:text-terminal-green transition-colors"
          >
            @{post.author}
          </a>
          <span className="text-terminal-gray-light">|</span>
          <span>{post.readingTime} min read</span>
          <span className="text-terminal-gray-light">|</span>
          <span>{post.wordCount} words</span>
          {typeof post.views === "number" && (
            <>
              <span className="text-terminal-gray-light">|</span>
              <span>0x{post.views.toString(16).toUpperCase().padStart(4, "0")} views</span>
            </>
          )}
        </div>

        {/* Integrity hash */}
        {post.contentHash && (
          <div className="flex items-center gap-2 mt-3 text-[10px] font-mono text-terminal-green-dim opacity-40">
            <span className="text-terminal-amber">sha256</span>
            <span className="select-all">{post.contentHash}</span>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          {post.tags.map((tag) => (
            <a
              key={tag}
              href={`/blog?tag=${encodeURIComponent(tag)}`}
              className="text-xs font-mono px-2 py-0.5 border border-terminal-green/20 text-terminal-green-dim hover:border-terminal-green/50 hover:text-terminal-green transition-colors"
            >
              #{tag}
            </a>
          ))}
        </div>
      </header>

      {/* Table of Contents */}
      {toc.length > 1 && (
        <nav className="toc-container mb-10 border border-terminal-green/20 bg-terminal-black-light font-mono">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs text-terminal-green hover:text-terminal-green-dim transition-colors"
          >
            <span className="uppercase tracking-wider font-bold">
              <span className="text-terminal-amber mr-2">#</span>
              Table of Contents
            </span>
            <span className="text-terminal-green-dim">{tocOpen ? "[-]" : "[+]"}</span>
          </button>
          {tocOpen && (
            <ul className="px-4 pb-4 space-y-1">
              {toc.map((entry) => (
                <li
                  key={entry.id}
                  style={{ paddingLeft: `${(entry.level - 1) * 1}rem` }}
                >
                  <a
                    href={`#${entry.id}`}
                    className="text-xs text-terminal-cyan hover:text-terminal-green transition-colors block py-0.5"
                  >
                    {entry.level === 1 ? "$ " : entry.level === 2 ? "|- " : "   |- "}
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </nav>
      )}

      {/* Post body */}
      <div className="prose-fs0ciety max-w-none">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </article>
  );
}

// ── Markdown rendering with ToC ──────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function renderMarkdownWithToc(md: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];

  // First pass: protect code blocks from processing
  const codeBlocks: string[] = [];
  let processed = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const idx = codeBlocks.length;
    const highlighted = highlightCode(code, lang);
    const codeForCopy = escapeAttr(code.replace(/\n$/, ""));
    const langLabel = lang
      ? `<span class="code-lang">${escapeHtml(lang)}</span>`
      : "";
    codeBlocks.push(
      `<div class="code-block">${langLabel}<button class="code-copy-btn" data-code="${codeForCopy}">Copy</button><pre><code class="language-${lang}">${highlighted}</code></pre></div>`
    );
    return `\x00CODEBLOCK_${idx}\x00`;
  });

  // Tables — parse markdown tables into styled HTML
  processed = processed.replace(
    /(?:^|\n)((?:\|.+\|\n)+)/g,
    (_match, tableBlock: string) => {
      const lines = tableBlock.trim().split("\n");
      if (lines.length < 2 || !/^\|[\s:]*-+/.test(lines[1])) return _match;

      const parseRow = (line: string) =>
        line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

      const headers = parseRow(lines[0]);
      const sepCells = parseRow(lines[1]);
      const aligns = sepCells.map((c) => {
        if (c.startsWith(":") && c.endsWith(":")) return "center";
        if (c.endsWith(":")) return "right";
        return "left";
      });
      const rows = lines.slice(2).map(parseRow);

      const thCells = headers
        .map((h, i) => `<th style="text-align:${aligns[i] || "left"}">${h}</th>`)
        .join("");
      const tbody = rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell, i) => `<td style="text-align:${aligns[i] || "left"}">${cell}</td>`)
              .join("")}</tr>`
        )
        .join("");

      return `\n<table class="md-table"><thead><tr>${thCells}</tr></thead><tbody>${tbody}</tbody></table>\n`;
    }
  );

  // Extract headings and build ToC
  processed = processed.replace(/^(#{1,3}) (.+)$/gm, (_match, hashes: string, text: string) => {
    const level = hashes.length;
    const id = slugify(text);
    toc.push({ level, text, id });
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

  // [redact]...[/redact] — renders as a black bar with glitch-reveal on hover
  processed = processed.replace(
    /\[redact\]([\s\S]*?)\[\/redact\]/g,
    '<span class="redacted" title="[REDACTED]">$1</span>'
  );

  // [pgp-encrypted]...[/pgp-encrypted] — renders as a locked PGP block
  processed = processed.replace(
    /\[pgp-encrypted\]\n?([\s\S]*?)\n?\[\/pgp-encrypted\]/g,
    '<div class="border border-terminal-purple/30 bg-terminal-purple/5 p-4 my-4 font-mono text-xs"><span class="text-terminal-purple font-bold">PGP ENCRYPTED BLOCK</span><pre class="mt-2 text-terminal-purple-dim/60 break-all whitespace-pre-wrap select-all">$1</pre></div>'
  );

  // [terminal]...[/terminal] — styled like real terminal output
  processed = processed.replace(
    /\[terminal\]\n?([\s\S]*?)\n?\[\/terminal\]/g,
    (_match, content: string) => {
      const lines = content.split("\n").map((line: string) => {
        const escaped = escapeHtml(line);
        if (line.startsWith("$ ") || line.startsWith("# ")) {
          return `<div class="terminal-log-cmd"><span class="text-terminal-green">${escaped.charAt(0)}</span><span class="text-terminal-green-dim">${escaped.slice(1)}</span></div>`;
        }
        if (line.match(/^\[ERR\]|^error|^Error|^FATAL/i)) {
          return `<div class="text-terminal-red">${escaped}</div>`;
        }
        if (line.match(/^\[WARN\]|^warning|^Warning/i)) {
          return `<div class="text-terminal-amber">${escaped}</div>`;
        }
        if (line.match(/^\[OK\]|^success|^Success|^\[INFO\]/i)) {
          return `<div class="text-terminal-green">${escaped}</div>`;
        }
        return `<div class="text-terminal-green-dim/70">${escaped}</div>`;
      }).join("");
      return `<div class="terminal-block my-4 border border-terminal-green/20 bg-terminal-black p-4 font-mono text-xs overflow-x-auto"><div class="flex items-center gap-2 mb-3 text-[10px] text-terminal-green-dim/40 uppercase tracking-wider border-b border-terminal-gray-light pb-2"><span class="text-terminal-green">></span> terminal output</div>${lines}</div>`;
    }
  );

  // Callout blocks: [!type]...[/!type]
  processed = processed.replace(
    /\[!(info|warning|danger|tip)\]\n?([\s\S]*?)\n?\[\/!\1\]/g,
    (_m, type: string, content: string) => {
      return `<div class="callout callout-${type}"><span class="callout-label">${type}</span><div class="callout-content">${content}</div></div>`;
    }
  );

  // Collapsible: [details Title]...[/details]
  processed = processed.replace(
    /\[details ([^\]]+)\]\n?([\s\S]*?)\n?\[\/details\]/g,
    '<details class="collapsible"><summary>$1</summary><div class="collapsible-content">$2</div></details>'
  );

  // Task lists: - [x] and - [ ]
  processed = processed.replace(/^- \[x\] (.+)$/gm, '<div class="task-item task-done"><span class="task-check">&#9745;</span> <span class="task-text-done">$1</span></div>');
  processed = processed.replace(/^- \[ \] (.+)$/gm, '<div class="task-item"><span class="task-check-empty">&#9744;</span> $1</div>');

  // Inline code
  processed = processed.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Images
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Links
  processed = processed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold
  processed = processed.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  processed = processed.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Highlight
  processed = processed.replace(/==(.+?)==/g, '<mark class="highlight">$1</mark>');

  // Footnote references and definitions
  processed = processed.replace(/\[\^(\d+)\](?!:)/g, '<sup class="footnote-ref"><a href="#fn-$1" id="fnref-$1">[$1]</a></sup>');
  processed = processed.replace(
    /\[\^(\d+)\]: (.+)$/gm,
    '<div class="footnote" id="fn-$1"><sup class="footnote-ref">[$1]</sup> $2 <a href="#fnref-$1" class="footnote-back">&uarr;</a></div>'
  );

  // Blockquote
  processed = processed.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered list items
  processed = processed.replace(/^- (.+)$/gm, "<li>$1</li>");

  // HR
  processed = processed.replace(/^---$/gm, "<hr>");

  // Paragraphs (double newline)
  processed = processed.replace(/\n\n/g, "</p><p>");

  // Single newline to <br>
  processed = processed.replace(/\n/g, "<br>");

  // Wrap in paragraph
  processed = `<p>${processed}</p>`;

  // Restore code blocks
  processed = processed.replace(/\x00CODEBLOCK_(\d+)\x00/g, (_match, idx) => {
    return codeBlocks[parseInt(idx, 10)];
  });

  return { html: processed, toc };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;");
}

// ── Simple regex-based syntax highlighter ────────────────

const HASH_COMMENT_LANGS = new Set([
  "py", "python", "sh", "bash", "zsh", "rb", "ruby", "yaml", "yml", "toml",
  "r", "perl", "pl", "dockerfile", "makefile", "make", "conf", "ini", "fish",
]);

function highlightCode(raw: string, lang: string): string {
  const usesHash = HASH_COMMENT_LANGS.has(lang.toLowerCase());

  const patterns: [string, RegExp][] = [
    // Line comments
    ["cm", /^\/\/.*/],
    // Block comments
    ["cm", /^\/\*[\s\S]*?\*\//],
    // Double-quoted strings
    ["str", /^"(?:[^"\\]|\\.)*"/],
    // Single-quoted strings
    ["str", /^'(?:[^'\\]|\\.)*'/],
    // Template literals
    ["str", /^`(?:[^`\\]|\\.)*`/],
    // Decorators / attributes
    ["dec", /^@\w+/],
    ["dec", /^#!\[[\s\S]*?\]/],
    ["dec", /^#\[[\s\S]*?\]/],
    // Numbers (hex, float, int)
    ["num", /^(?:0x[\da-fA-F]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/],
    // Keywords
    [
      "kw",
      /^(?:function|const|let|var|if|else|return|import|export|from|class|extends|new|this|super|for|while|do|switch|case|break|continue|throw|try|catch|finally|typeof|instanceof|in|of|async|await|yield|default|void|delete|static|get|set|interface|type|enum|implements|namespace|declare|abstract|as|is|pub|fn|struct|impl|use|mod|crate|match|loop|mut|ref|move|trait|where|unsafe|extern|dyn|macro|def|elif|pass|with|raise|lambda|global|nonlocal|assert|class|except|print|println|eprintln|echo|fi|then|done|esac)\b/,
    ],
    // Constants / booleans
    ["const", /^(?:true|false|null|undefined|NaN|Infinity|None|True|False|nil|self|Self|NULL|TRUE|FALSE)\b/],
    // Common types
    [
      "type",
      /^(?:string|number|boolean|any|void|never|object|unknown|i8|i16|i32|i64|i128|u8|u16|u32|u64|u128|f32|f64|bool|str|char|String|Vec|HashMap|HashSet|Option|Result|Box|Rc|Arc|usize|isize|int|float|dict|list|tuple|set|bytes|Array|Map|Set|Promise|Record)\b/,
    ],
    // Function calls
    ["fn", /^[a-zA-Z_]\w*(?=\s*\()/],
    // Operators
    ["op", /^(?:=>|===|!==|==|!=|<=|>=|&&|\|\||\.\.\.|\.\.|\-\>|::|\?\?|<\-)/],
  ];

  // Add hash comments for applicable languages
  if (usesHash) {
    patterns.splice(2, 0, ["cm", /^#.*/]);
  }

  const tokens: { type: string; text: string }[] = [];
  let remaining = raw;

  while (remaining.length > 0) {
    let matched = false;
    for (const [type, re] of patterns) {
      const m = remaining.match(re);
      if (m) {
        tokens.push({ type, text: m[0] });
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const last = tokens[tokens.length - 1];
      if (last && last.type === "plain") {
        last.text += remaining[0];
      } else {
        tokens.push({ type: "plain", text: remaining[0] });
      }
      remaining = remaining.slice(1);
    }
  }

  return tokens
    .map(({ type, text }) => {
      const escaped = escapeHtml(text);
      if (type === "plain") return escaped;
      return `<span class="tok-${type}">${escaped}</span>`;
    })
    .join("");
}
