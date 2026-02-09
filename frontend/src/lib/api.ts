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

export const api = {
  health: () => request<{ status: string; version: string }>("/api/health"),
  ping: () => request<string>("/api/ping"),

  // Auth
  login: (username: string, password: string) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  // Blog
  posts: () => request<{ posts: import("@/types").PostMeta[]; total: number }>("/api/posts"),
  post: (slug: string) => request<import("@/types").Post>(`/api/posts/${slug}`),

  // Seedbox
  seedboxStats: () => request("/api/seedbox/stats"),
  sonarrSeries: () => request("/api/sonarr/series"),
  sonarrCalendar: () => request("/api/sonarr/calendar"),
};
