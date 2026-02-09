import type { Post, PostMeta, PostPayload, AdminStats } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Typed fetch wrapper for the Axum backend. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }

  return res.json();
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  health: () => request<{ status: string; version: string }>("/api/health"),
  ping: () => request<string>("/api/ping"),

  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: { username: string; role: string } }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }
    ),

  // Blog (public)
  posts: () =>
    request<{ posts: PostMeta[]; total: number }>("/api/posts"),
  post: (slug: string) => request<Post>(`/api/posts/${slug}`),
  tags: () =>
    request<{ tags: { name: string; count: number }[] }>("/api/tags"),

  // Seedbox
  seedboxStats: () => request("/api/seedbox/stats"),
  sonarrSeries: () => request("/api/sonarr/series"),
  sonarrCalendar: () => request("/api/sonarr/calendar"),

  // ── Admin ────────────────────────────────────────────
  admin: {
    stats: (token?: string) =>
      request<AdminStats>("/api/admin/stats", {
        headers: token ? authHeaders(token) : {},
      }),
    listPosts: (token?: string) =>
      request<{ posts: PostMeta[]; total: number }>("/api/admin/posts", {
        headers: token ? authHeaders(token) : {},
      }),
    getPost: (slug: string, token?: string) =>
      request<Post>(`/api/admin/posts/${slug}`, {
        headers: token ? authHeaders(token) : {},
      }),
    createPost: (data: PostPayload, token?: string) =>
      request<Post>("/api/admin/posts", {
        method: "POST",
        body: JSON.stringify(data),
        headers: token ? authHeaders(token) : {},
      }),
    updatePost: (slug: string, data: PostPayload, token?: string) =>
      request<Post>(`/api/admin/posts/${slug}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: token ? authHeaders(token) : {},
      }),
    deletePost: (slug: string, token?: string) =>
      request<{ deleted: boolean; slug: string }>(`/api/admin/posts/${slug}`, {
        method: "DELETE",
        headers: token ? authHeaders(token) : {},
      }),
  },
};
