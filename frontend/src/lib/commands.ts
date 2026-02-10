import type { TerminalCommand, TerminalLine } from "@/types";
import { uid } from "./utils";

/** Create a system output line. */
function sys(content: string): TerminalLine {
  return { id: uid(), type: "system", content, timestamp: Date.now() };
}

/** Create a standard output line. */
function out(content: string): TerminalLine {
  return { id: uid(), type: "output", content, timestamp: Date.now() };
}

/** Create an error output line. */
function err(content: string): TerminalLine {
  return { id: uid(), type: "error", content, timestamp: Date.now() };
}

/** Create an ASCII art output line. */
function ascii(content: string): TerminalLine {
  return { id: uid(), type: "ascii", content, timestamp: Date.now() };
}

/** Create an image output line. */
function img(src: string): TerminalLine {
  return { id: uid(), type: "image", content: src, timestamp: Date.now() };
}

const PGP_FINGERPRINT = "6145 0220 51E0 CB3E";
const PGP_UID = "phant0mhex <phant0mhex@proton.me>";

export const COMMANDS: Record<string, TerminalCommand> = {
  help: {
    name: "help",
    description: "Display available commands",
    execute: () => [
      sys("┌─────────────────────────────────────────────┐"),
      sys("│         fs0ciety — COMMAND REFERENCE         │"),
      sys("├─────────────────────────────────────────────┤"),
      out("  help              Show this help message"),
      out("  ls                List blog posts"),
      out("  cat <slug>        Read a blog post"),
      out("  whoami [-v]       Display current user / env"),
      out("  status            System health check"),
      out("  dashboard         Open command center"),
      out("  clear             Clear terminal"),
      out("  neofetch          System info"),
      out("  uname             OS info"),
      sys("├─────────────────────── SECURITY ─────────────┤"),
      out("  gpg               Show PGP public key"),
      out("  fingerprint       Show key fingerprint"),
      out("  verify <slug>     Verify post integrity hash"),
      out("  canary            Show warrant canary status"),
      sys("├──────────────────────── SEARCH ───────────────┤"),
      out("  grep <query>      Search blog posts"),
      sys("└─────────────────────────────────────────────┘"),
    ],
  },

  ls: {
    name: "ls",
    description: "List blog posts",
    usage: "ls [--all]",
    execute: (_args, ctx) => {
      fetch("/api/posts")
        .then((r) => {
          if (!r.ok) throw new Error("failed");
          return r.json();
        })
        .then(
          (
            posts: {
              slug: string;
              title: string;
              wordCount: number;
              createdAt: string;
            }[]
          ) => {
            if (!posts.length) {
              ctx.addLines([sys("drwxr-xr-x  posts/"), out("  (empty)")]);
              return;
            }
            const lines: TerminalLine[] = [sys("drwxr-xr-x  posts/"), out("")];
            let totalWords = 0;
            for (const p of posts) {
              totalWords += p.wordCount;
              const size =
                p.wordCount > 1000
                  ? `${(p.wordCount / 1000).toFixed(1)}K`
                  : `${p.wordCount}`;
              const d = new Date(p.createdAt);
              const dateStr = isNaN(d.getTime())
                ? "---"
                : d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                  });
              lines.push(
                out(
                  `  -rw-r--r--  ${p.slug.padEnd(32)} ${size.padStart(6)}  ${dateStr}`
                )
              );
            }
            const totalSize =
              totalWords > 1000
                ? `${(totalWords / 1000).toFixed(1)}K`
                : `${totalWords}`;
            lines.push(out(""));
            lines.push(
              sys(
                `${posts.length} file${posts.length !== 1 ? "s" : ""}, ${totalSize} words total`
              )
            );
            ctx.addLines(lines);
          }
        )
        .catch(() => {
          ctx.addLines([err("Failed to read /posts — API offline?")]);
        });
      return [sys("Reading directory /posts ...")];
    },
  },

  cat: {
    name: "cat",
    description: "Read a blog post",
    usage: "cat <slug>",
    execute: (args, ctx) => {
      if (!args[0]) {
        return [err("Usage: cat <slug>"), err("Try: cat hello-world")];
      }
      const slug = args[0];
      setTimeout(() => ctx.navigate(`/blog/${slug}`), 600);
      return [
        sys(`Loading ${slug}...`),
        out("Redirecting to post view."),
      ];
    },
  },

  whoami: {
    name: "whoami",
    description: "Display current user",
    usage: "whoami [-v]",
    execute: (args) => {
      if (args.includes("-v") || args.includes("--verbose")) {
        const nav = navigator as Navigator & {
          deviceMemory?: number;
          connection?: { effectiveType?: string };
        };
        return [
          sys("╔══════════════════════════════════════════╗"),
          sys("║         CLIENT ENVIRONMENT                ║"),
          sys("╠══════════════════════════════════════════╣"),
          out(`  user:       guest@fs0ciety`),
          out(`  platform:   ${nav.platform || "unknown"}`),
          out(`  language:   ${nav.language}`),
          out(`  cores:      ${nav.hardwareConcurrency || "?"}`),
          out(`  memory:     ${nav.deviceMemory ? nav.deviceMemory + " GB" : "hidden"}`),
          out(`  screen:     ${screen.width}x${screen.height}`),
          out(`  color:      ${screen.colorDepth}-bit`),
          out(`  dpr:        ${window.devicePixelRatio}x`),
          out(`  touch:      ${("ontouchstart" in window) ? "yes" : "no"}`),
          out(`  timezone:   ${Intl.DateTimeFormat().resolvedOptions().timeZone}`),
          out(`  dnt:        ${nav.doNotTrack || "unset"}`),
          out(`  cookies:    ${nav.cookieEnabled ? "enabled" : "disabled"}`),
          out(`  connection: ${nav.connection?.effectiveType || "unknown"}`),
          out(`  protocol:   ${window.location.protocol}`),
          sys("╚══════════════════════════════════════════╝"),
          out(""),
          out("  Run 'nmap' for service scan."),
          out("  Visit /blog/fingerprint for full analysis."),
        ];
      }
      return [out("guest@fs0ciety")];
    },
  },

  status: {
    name: "status",
    description: "Check system health",
    execute: () => [
      sys("╔══════════════════════════════════════╗"),
      sys("║       SYSTEM STATUS CHECK            ║"),
      sys("╠══════════════════════════════════════╣"),
      out("  Backend API      [ ● ONLINE  ]  12ms"),
      out("  SurrealDB        [ ● ONLINE  ]  3ms"),
      out("  Plex             [ ● ONLINE  ]  45ms"),
      out("  Sonarr           [ ● ONLINE  ]  38ms"),
      out("  Radarr           [ ● ONLINE  ]  41ms"),
      out("  qBittorrent      [ ● ONLINE  ]  8ms"),
      sys("╚══════════════════════════════════════╝"),
    ],
  },

  clear: {
    name: "clear",
    description: "Clear terminal output",
    execute: (_args, ctx) => {
      ctx.clearLines();
      return [];
    },
  },

  neofetch: {
    name: "neofetch",
    description: "Display system info",
    execute: () => [
      img("/logo.svg"),
      ascii(""),
      out("  OS:       fs0ciety v0.1.0"),
      out("  Host:     ████████"),
      out("  Kernel:   Axum 0.8 / Tokio"),
      out("  Shell:    React Terminal"),
      out("  DB:       SurrealDB 2.x"),
      out("  Frontend: Next.js 15 / React 19"),
      out("  Theme:    CRT Green"),
      out("  Uptime:   always"),
      ascii(""),
    ],
  },

  uname: {
    name: "uname",
    description: "OS info",
    execute: () => [out("fs0ciety 0.1.0 x86_64 Rust/Axum Next.js/React SurrealDB")],
  },

  dashboard: {
    name: "dashboard",
    description: "Open seedbox command center",
    execute: (_args, ctx) => {
      ctx.navigate("/dashboard");
      return [sys("Entering Command Center...")];
    },
  },

  ssh: {
    name: "ssh",
    description: "Open admin login",
    execute: (_args, ctx) => {
      ctx.navigate("/login");
      return [sys("Initiating SSH handshake...")];
    },
  },

  // ── Security commands ────────────────────────────────────

  gpg: {
    name: "gpg",
    description: "Show PGP public key info",
    execute: (_args, ctx) => {
      setTimeout(() => ctx.navigate("/blog/pgp"), 1500);
      return [
        sys("╔══════════════════════════════════════════╗"),
        sys("║           PGP PUBLIC KEY INFO             ║"),
        sys("╠══════════════════════════════════════════╣"),
        out(`  uid:          ${PGP_UID}`),
        out(`  fingerprint:  ${PGP_FINGERPRINT}`),
        out("  algo:         RSA 4096"),
        out("  expires:      never"),
        sys("╚══════════════════════════════════════════╝"),
        out(""),
        out("  Redirecting to full key page..."),
        out("  Run 'fingerprint' for quick verify."),
      ];
    },
  },

  fingerprint: {
    name: "fingerprint",
    description: "Show PGP key fingerprint",
    execute: () => [
      sys("PGP Key Fingerprint:"),
      out(""),
      out(`  ${PGP_FINGERPRINT}`),
      out(""),
      out(`  uid: ${PGP_UID}`),
      out("  Verify via independent channel before trusting."),
    ],
  },

  verify: {
    name: "verify",
    description: "Verify post integrity hash",
    usage: "verify <slug>",
    execute: (args, ctx) => {
      if (!args[0]) {
        return [
          err("Usage: verify <slug>"),
          err("Fetches the post and displays its SHA-256 content hash."),
        ];
      }
      const slug = args[0];

      // Async fetch — add lines after command returns
      fetch(`/api/posts/${slug}`)
        .then((r) => {
          if (!r.ok) throw new Error("not found");
          return r.json();
        })
        .then((post) => {
          ctx.addLines([
            sys(`╔══ INTEGRITY CHECK: ${slug} ══╗`),
            out(""),
            out(`  title:   ${post.title}`),
            out(`  author:  ${post.author}`),
            out(`  sha256:  ${post.contentHash}`),
            out(`  words:   ${post.wordCount}`),
            out(""),
            out("  Status: [+] Hash computed server-side."),
            out("  Compare against independently published hash."),
            sys("╚════════════════════════════════════════╝"),
          ]);
        })
        .catch(() => {
          ctx.addLines([err(`Post '${slug}' not found or not published.`)]);
        });

      return [sys(`Fetching integrity data for '${slug}'...`)];
    },
  },

  canary: {
    name: "canary",
    description: "Show warrant canary status",
    execute: (_args, ctx) => {
      setTimeout(() => ctx.navigate("/blog/pgp"), 2000);
      return [
        sys("╔══════════════════════════════════════════╗"),
        sys("║         WARRANT CANARY STATUS             ║"),
        sys("╠══════════════════════════════════════════╣"),
        out("  [+] No NSLs received"),
        out("  [+] No gag orders received"),
        out("  [+] No warrants for user data"),
        out("  [+] No searches/seizures on infra"),
        out("  [+] No backdoors planted"),
        out(""),
        out(`  Last updated: ${new Date().toISOString().split("T")[0]}`),
        sys("╚══════════════════════════════════════════╝"),
        out(""),
        out("  Redirecting to full canary page..."),
      ];
    },
  },

  // ── Recon commands ─────────────────────────────────────

  grep: {
    name: "grep",
    description: "Search blog posts",
    usage: "grep <query>",
    execute: (args, ctx) => {
      const query = args.join(" ");
      if (!query) {
        return [err("Usage: grep <query>"), err("Searches post titles, tags, and excerpts.")];
      }

      fetch("/api/posts")
        .then((r) => {
          if (!r.ok) throw new Error("failed");
          return r.json();
        })
        .then(
          (data: {
            posts: {
              slug: string;
              title: string;
              tags: string[];
              excerpt: string;
              readingTime: number;
            }[];
          }) => {
            const q = query.toLowerCase();
            const matches = (data.posts ?? []).filter(
              (p) =>
                p.title.toLowerCase().includes(q) ||
                p.tags.some((t) => t.toLowerCase().includes(q)) ||
                p.excerpt?.toLowerCase().includes(q) ||
                p.slug.toLowerCase().includes(q)
            );

            if (!matches.length) {
              ctx.addLines([out(`  No matches for '${query}'.`)]);
              return;
            }

            const lines: TerminalLine[] = [
              sys(`Found ${matches.length} match${matches.length !== 1 ? "es" : ""}:`),
              out(""),
            ];
            for (const m of matches) {
              lines.push(
                out(`  \x1b[32m${m.slug}\x1b[0m  ${m.title}`),
                out(`    ${m.tags.map((t) => `#${t}`).join(" ")} · ${m.readingTime} min read`)
              );
            }
            lines.push(out(""));
            lines.push(out("  Use 'cat <slug>' to read a post."));
            ctx.addLines(lines);
          }
        )
        .catch(() => {
          ctx.addLines([err("Failed to search — API offline?")]);
        });

      return [sys(`grep: searching for '${query}'...`)];
    },
  },
};

/** Parse and execute a raw command string. */
export function executeCommand(
  raw: string,
  ctx: import("@/types").TerminalContext
): TerminalLine[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s+/);
  const name = parts[0].toLowerCase();
  const args = parts.slice(1);

  const cmd = COMMANDS[name];
  if (!cmd) {
    return [
      {
        id: uid(),
        type: "error",
        content: `command not found: ${name}. Type 'help' for available commands.`,
        timestamp: Date.now(),
      },
    ];
  }

  return cmd.execute(args, ctx);
}
