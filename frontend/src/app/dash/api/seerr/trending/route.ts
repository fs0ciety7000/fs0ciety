import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SEERR_URL = process.env.SEERR_URL || "https://scout.phantomhex.cc";
const SEERR_API_KEY = process.env.SEERR_API_KEY || "";

interface RawResult {
  id: number;
  mediaType: string;
  title?: string;
  name?: string;
  originalTitle?: string;
  originalName?: string;
  releaseDate?: string;
  firstAirDate?: string;
  posterPath?: string;
  overview?: string;
  mediaInfo?: { status?: number };
}

export async function GET() {
  if (!SEERR_API_KEY) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(`${SEERR_URL}/api/v1/discover/trending`, {
      headers: { "X-Api-Key": SEERR_API_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();

    const results = (data.results || [])
      .filter((r: RawResult) => r.mediaType === "movie" || r.mediaType === "tv")
      .slice(0, 20)
      .map((r: RawResult) => ({
        id: r.id,
        tmdbId: r.id,
        mediaType: r.mediaType,
        title: r.title || r.name || r.originalTitle || r.originalName || "Unknown",
        year: r.releaseDate?.slice(0, 4) || r.firstAirDate?.slice(0, 4) || null,
        posterPath: r.posterPath || null,
        overview: r.overview?.slice(0, 250) || null,
        mediaStatus: r.mediaInfo?.status ?? 0,
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
