import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const JELLYFIN_URL = (process.env.JELLYFIN_URL || "https://jf.phantomhex.cc").replace(/\/$/, "");
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || "";

/** Proxy Jellyfin artwork without exposing the API key in browser-visible image URLs. */
export async function GET(request: NextRequest) {
  if (!JELLYFIN_API_KEY) return new Response("JELLYFIN_API_KEY not configured", { status: 503 });

  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^(?:[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i.test(id)) {
    return new Response("Invalid item id", { status: 400 });
  }

  try {
    const response = await fetch(`${JELLYFIN_URL}/Items/${id}/Images/Primary?maxHeight=320`, {
      headers: { "X-Emby-Token": JELLYFIN_API_KEY, Accept: "image/*" },
      signal: AbortSignal.timeout(8000),
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
  }
}
