/** Shared server-only Plex connection settings for metadata and artwork routes. */
export const PLEX_URL = process.env.PLEX_URL ||
  "https://185-203-56-82.c92770c35f2f4a72a1ad6b1e8f07da83.plex.direct:18825";
export const PLEX_TOKEN = process.env.PLEX_TOKEN;

export function plexHeaders(accept = "application/json"): HeadersInit {
  return { ...(PLEX_TOKEN ? { "X-Plex-Token": PLEX_TOKEN } : {}), Accept: accept };
}
