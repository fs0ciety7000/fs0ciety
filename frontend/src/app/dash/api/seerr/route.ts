import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SEERR_URL = process.env.SEERR_URL || "https://requests.cinenode.org";
const SEERR_API_KEY = process.env.SEERR_API_KEY || "";

function seerrHeaders(): HeadersInit {
  return { "X-Api-Key": SEERR_API_KEY, Accept: "application/json" };
}

interface SeerrMedia {
  id: number;
  tmdbId: number;
  tvdbId?: number;
  status: number;
  mediaType: string;
  posterPath?: string;
  title?: string;
  originalTitle?: string;
  name?: string;
  originalName?: string;
}

interface SeerrRequest {
  id: number;
  status: number; // 1=pending, 2=approved, 3=declined, 4=processing, 5=available
  type: "movie" | "tv";
  media: SeerrMedia;
  requestedBy: { id: number; displayName: string; avatar?: string };
  createdAt: string;
  updatedAt: string;
}

interface SeerrCount {
  total: number;
  movie: number;
  tv: number;
  pending: number;
  approved: number;
  declined: number;
  processing: number;
  available: number;
}

function statusLabel(status: number): string {
  switch (status) {
    case 1: return "pending";
    case 2: return "approved";
    case 3: return "declined";
    case 4: return "processing";
    case 5: return "available";
    default: return "unknown";
  }
}

interface ResolvedMedia { title: string; posterPath: string | null }

// Fetch title + poster for a request.
// Jellyseerr may embed title/name and posterPath directly in media;
// if not, fetch the individual media endpoint (movie/{tmdbId} or tv/{tmdbId}).
async function resolveMedia(req: SeerrRequest): Promise<ResolvedMedia> {
  const directTitle =
    req.type === "movie"
      ? req.media.title || req.media.originalTitle
      : req.media.name || req.media.originalName;
  const directPoster = req.media.posterPath || null;

  if (directTitle && directPoster) {
    return { title: directTitle, posterPath: directPoster };
  }

  try {
    const endpoint =
      req.type === "movie"
        ? `${SEERR_URL}/api/v1/movie/${req.media.tmdbId}`
        : `${SEERR_URL}/api/v1/tv/${req.media.tmdbId}`;
    const res = await fetch(endpoint, {
      headers: seerrHeaders(),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || data.name || directTitle || "Unknown",
        posterPath: data.posterPath || directPoster,
      };
    }
  } catch { /* ignore */ }

  return { title: directTitle || "Unknown", posterPath: directPoster };
}

export async function GET() {
  if (!SEERR_API_KEY) {
    return NextResponse.json(
      { error: "SEERR_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const [requestsRes, countRes] = await Promise.allSettled([
      fetch(`${SEERR_URL}/api/v1/request?take=10&skip=0&sort=added`, {
        headers: seerrHeaders(),
      }),
      fetch(`${SEERR_URL}/api/v1/request/count`, { headers: seerrHeaders() }),
    ]);

    let requests: Array<{
      id: number;
      title: string;
      type: string;
      status: string;
      posterUrl: string | null;
      requestedBy: string;
      createdAt: string;
    }> = [];

    if (requestsRes.status === "fulfilled" && requestsRes.value.ok) {
      const data = await requestsRes.value.json();
      const rawRequests: SeerrRequest[] = data.results || [];

      const resolved = await Promise.all(rawRequests.map(resolveMedia));

      requests = rawRequests.map((r, i) => ({
        id: r.id,
        title: resolved[i].title,
        type: r.type,
        status: statusLabel(r.status),
        posterUrl: resolved[i].posterPath
          ? `https://image.tmdb.org/t/p/w342${resolved[i].posterPath}`
          : null,
        requestedBy: r.requestedBy.displayName,
        createdAt: r.createdAt,
      }));
    }

    let counts: SeerrCount | null = null;
    if (countRes.status === "fulfilled" && countRes.value.ok) {
      counts = await countRes.value.json();
    }

    return NextResponse.json({ requests, counts });
  } catch {
    return NextResponse.json({ requests: [], counts: null }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!SEERR_API_KEY) {
    return NextResponse.json({ error: "SEERR_API_KEY not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { mediaType, mediaId, seasons, is4k = false } = body as {
      mediaType: string;
      mediaId: number;
      seasons?: number[];
      is4k?: boolean;
    };

    if (!mediaType || !mediaId) {
      return NextResponse.json({ error: "mediaType and mediaId are required" }, { status: 400 });
    }

    const payload: Record<string, unknown> = { mediaType, mediaId, is4k };
    if (mediaType === "tv" && Array.isArray(seasons) && seasons.length > 0) {
      payload.seasons = seasons;
    }

    const res = await fetch(`${SEERR_URL}/api/v1/request`, {
      method: "POST",
      headers: {
        "X-Api-Key": SEERR_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      return NextResponse.json(
        { error: err.message || `Seerr error ${res.status}` },
        { status: res.status }
      );
    }

    const result = await res.json() as { id?: number };
    return NextResponse.json({ success: true, id: result.id });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
