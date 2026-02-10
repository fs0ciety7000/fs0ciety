import type { Post, PostMeta, PostPayload, AdminStats, UserPublic } from "@/types";

// Same-origin: Traefik routes /api/* to the backend.
// In local dev, Next.js rewrites (next.config.ts) proxy to localhost:3001.
const API_BASE = "";

/** Typed fetch wrapper for the Axum backend. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { headers: initHeaders, ...rest } = init ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(initHeaders as Record<string, string>),
    },
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
    request<{ token: string; user: { username: string; role: string }; message: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }
    ),
  me: (token: string) =>
    request<{ username: string; role: string }>("/api/auth/me", {
      headers: authHeaders(token),
    }),
  changePassword: (currentPassword: string, newPassword: string, token: string) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      headers: authHeaders(token),
    }),
  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    }),

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
    // User management
    listUsers: (token: string) =>
      request<{ users: UserPublic[]; total: number }>("/api/admin/users", {
        headers: authHeaders(token),
      }),
    createUser: (data: { username: string; password: string; role: string; email?: string }, token: string) =>
      request<{ message: string; username: string }>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
        headers: authHeaders(token),
      }),
    deleteUser: (username: string, token: string) =>
      request<{ deleted: boolean; username: string }>(`/api/admin/users/${username}`, {
        method: "DELETE",
        headers: authHeaders(token),
      }),
  },
};
