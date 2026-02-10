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
      out("  whoami            Display current user"),
      out("  status            System health check"),
      out("  dashboard         Open command center"),
      out("  clear             Clear terminal"),
      out("  neofetch          System info"),
      out("  uname             OS info"),
      sys("└─────────────────────────────────────────────┘"),
    ],
  },

  ls: {
    name: "ls",
    description: "List blog posts",
    usage: "ls [--all]",
    execute: () => [
      sys("drwxr-xr-x  posts/"),
      out("  -rw-r--r--  hello-world.mdx          2.4K"),
      out("  -rw-r--r--  building-fs0ciety.mdx     4.1K"),
      out("  -rw-r--r--  rust-axum-guide.mdx       3.8K"),
      sys("3 files, 10.3K total"),
    ],
  },

  cat: {
    name: "cat",
    description: "Read a blog post",
    usage: "cat <slug>",
    execute: (args) => {
      if (!args[0]) {
        return [err("Usage: cat <slug>"), err("Try: cat hello-world")];
      }
      return [
        sys(`Loading ${args[0]}...`),
        out("Redirecting to post view."),
      ];
    },
  },

  whoami: {
    name: "whoami",
    description: "Display current user",
    execute: () => [out("guest@fs0ciety")],
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
      ascii("       ▄▄▄████████▄▄▄         "),
      ascii("     ▄██░░░░░░░░░░░░██▄       guest@fs0ciety"),
      ascii("   ▄██░░░░░░░░░░░░░░░░██▄     ──────────────────"),
      ascii("  ██░░░░░░░░░░░░░░░░░░░░██    OS     fs0ciety v0.1.0"),
      ascii("  ██░░░░████░░░░████░░░░██    Host   Hetzner VPS"),
      ascii("  ██░░░░████░░░░████░░░░██    Kernel Axum 0.8"),
      ascii("  ██░░░░░░░░░░░░░░░░░░░░██    Shell  React Terminal"),
      ascii("  ██░░░░░░░░░▄▄░░░░░░░░░██    DB     SurrealDB 2.x"),
      ascii("   ██░░░░▄▀▀░░░▀▀▄░░░░██     Theme  CRT Green"),
      ascii("    ██░░░░░░░░░░░░░░░░██      Pkgs   Rust + Next.js"),
      ascii("     ▀██░░░░░░░░░░░░██▀       Uptime always"),
      ascii("       ▀▀████████▀▀           "),
      ascii("                               > we are fs0ciety"),
      ascii("     [ SYSTEM COMPROMISED ]    > control is an illusion"),
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
