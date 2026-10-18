import { NextRequest } from "next/server";
import { PLEX_TOKEN, PLEX_URL, plexHeaders } from "../config";

export const dynamic = "force-dynamic";

/** Proxy Plex artwork through the app so browsers don't need direct Plex access or expose its token. */
export async function GET(request: NextRequest) {
  if (!PLEX_TOKEN) return new Response("PLEX_TOKEN not configured", { status: 503 });

  const path = request.nextUrl.searchParams.get("path") || "";
  if (!/^\/library\/metadata\/\d+\/(?:thumb|art|banner)\/\d+$/.test(path)) {
    return new Response("Invalid artwork path", { status: 400 });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${PLEX_URL}${path}`, {
      headers: plexHeaders("image/*"),
      signal: controller.signal,
      cache: "force-cache",
      next: { revalidate: 3600 },
    });
    if (!response.ok) return new Response(null, { status: response.status });
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return new Response("Invalid artwork response", { status: 502 });
    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
