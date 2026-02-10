/** Terminal command line entry. */
export interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "system" | "ascii" | "image";
  content: string;
  timestamp: number;
}

/** Terminal command definition. */
export interface TerminalCommand {
  name: string;
  description: string;
  usage?: string;
  execute: (args: string[], ctx: TerminalContext) => TerminalLine[];
}

/** Context passed to terminal commands. */
export interface TerminalContext {
  addLines: (lines: TerminalLine[]) => void;
  clearLines: () => void;
  setPrompt: (prompt: string) => void;
  navigate: (path: string) => void;
  currentPath: string;
}

/** Seedbox real-time stats from WebSocket. */
export interface SeedboxStats {
  downloadSpeed: number;
  uploadSpeed: number;
  diskUsed: number;
  diskTotal: number;
  activeTorrents: number;
  seedingTorrents: number;
  services?: Record<string, { online: boolean; latency_ms: number | null }>;
}

/** Service health status. */
export interface ServiceHealth {
  name: string;
  online: boolean;
  latencyMs: number | null;
}

/** Blog post metadata. */
export interface PostMeta {
  slug: string;
  title: string;
  tags: string[];
  published: boolean;
  author: string;
  createdAt: string;
  readingTime: number;
  wordCount: number;
  excerpt: string;
  contentHash: string;
  views: number;
}

/** Full blog post. */
export interface Post extends PostMeta {
  content: string;
  updatedAt: string;
}

/** Payload for creating/updating a post. */
export interface PostPayload {
  title: string;
  slug: string;
  content: string;
  tags: string[];
  published: boolean;
}

/** Dashboard stats returned by /api/admin/stats. */
export interface AdminStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalTags: number;
  totalWords: number;
}

/** Auth state. */
export interface AuthState {
  authenticated: boolean;
  username: string | null;
  role: "admin" | "guest" | null;
  token: string | null;
}

/** User info returned by admin API. */
export interface UserPublic {
  username: string;
  role: string;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  profile_public: boolean;
  created_at: string;
  last_login: string | null;
  /** Present when profile is private and viewer is not the owner. */
  private?: boolean;
}
