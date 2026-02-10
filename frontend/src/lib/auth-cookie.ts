/**
 * Cross-subdomain auth cookie helpers.
 *
 * localStorage is per-origin, so auth set on fs0ciety.org is invisible
 * to blog.fs0ciety.org.  We mirror the token + user data into a cookie
 * scoped to `.fs0ciety.org` so every subdomain can read it.
 */

const DOMAIN = (typeof window !== "undefined" && process.env.NEXT_PUBLIC_DOMAIN) || "fs0ciety.org";
const COOKIE_DOMAIN = `.${DOMAIN.split(":")[0]}`;
const TOKEN_KEY = "fs0ciety_token";
const USER_KEY = "fs0ciety_user";

/** Set auth data in both localStorage and a cross-subdomain cookie. */
export function setAuth(token: string, user: { username: string; role: string }) {
  // localStorage (same-origin fast path)
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));

  // Cross-subdomain cookies — 7 days, matching JWT expiry
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
  const opts = `path=/; domain=${COOKIE_DOMAIN}; expires=${expires}; SameSite=Lax; Secure`;
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; ${opts}`;
  document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(user))}; ${opts}`;
}

/** Clear auth from both localStorage and cookies. */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  const opts = `path=/; domain=${COOKIE_DOMAIN}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure`;
  document.cookie = `${TOKEN_KEY}=; ${opts}`;
  document.cookie = `${USER_KEY}=; ${opts}`;
}

/** Read auth user from localStorage first, fall back to cookie. */
export function getAuthUser(): { username: string; role: string } | null {
  // Try localStorage (fast)
  const raw = localStorage.getItem(USER_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }

  // Try cookie (cross-subdomain)
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${USER_KEY}=([^;]*)`));
  if (match) {
    try { return JSON.parse(decodeURIComponent(match[1])); } catch { /* ignore */ }
  }

  return null;
}

/** Read auth token from localStorage first, fall back to cookie. */
export function getAuthToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;

  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${TOKEN_KEY}=([^;]*)`));
  if (match) return decodeURIComponent(match[1]);

  return null;
}
