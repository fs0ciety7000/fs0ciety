import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SEERR_URL = process.env.SEERR_URL || "https://requests.cinenode.org";
const SEERR_API_KEY = process.env.SEERR_API_KEY || "";

function seerrHeaders(): HeadersInit {
  return {
    "X-Api-Key": SEERR_API_KEY,
    Accept: "application/json",
  };
}

interface SeerrRequest {
  id: number;
  status: number; // 1=pending, 2=approved, 3=declined, 4=processing, 5=available
  type: "movie" | "tv";
  media: {
    id: number;
    tmdbId: number;
    tvdbId?: number;
    status: number;
    mediaType: string;
    posterPath?: string;
  };
  requestedBy: {
    id: number;
    displayName: string;
    avatar?: string;
  };
  modifiedBy?: {
    displayName: string;
  };
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

// Fetch media details from Seerr to get the title
async function fetchMediaTitle(req: SeerrRequest): Promise<string> {
  try {
    const endpoint =
      req.type === "movie"
        ? `${SEERR_URL}/api/v1/movie/${req.media.tmdbId}`
        : `${SEERR_URL}/api/v1/tv/${req.media.tmdbId}`;
    const res = await fetch(endpoint, { headers: seerrHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.title || data.name || "Unknown";
    }
  } catch { /* ignore */ }
  return "Unknown";
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
      fetch(
        `${SEERR_URL}/api/v1/request?take=10&skip=0&sort=modified&requestedBy=all`,
        { headers: seerrHeaders() }
      ),
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

      // Fetch titles in parallel
      const titles = await Promise.all(
        rawRequests.map((r) => fetchMediaTitle(r))
      );

      requests = rawRequests.map((r, i) => ({
        id: r.id,
        title: titles[i],
        type: r.type,
        status: statusLabel(r.status),
        posterUrl: r.media.posterPath
          ? `https://image.tmdb.org/t/p/w185${r.media.posterPath}`
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
