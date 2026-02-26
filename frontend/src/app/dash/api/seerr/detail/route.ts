import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const SEERR_URL = process.env.SEERR_URL || "https://scout.phantomhex.cc";
const SEERR_API_KEY = process.env.SEERR_API_KEY || "";

interface RawSeason {
  seasonNumber: number;
  name?: string;
  episodeCount?: number;
  airDate?: string;
}

interface RawMediaInfoSeason {
  seasonNumber: number;
  status?: number;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type") || "movie";

  if (!id || !SEERR_API_KEY) {
    return NextResponse.json({ seasons: [], mediaStatus: 0, requestedSeasons: [] });
  }

  const endpoint =
    type === "tv"
      ? `${SEERR_URL}/api/v1/tv/${id}`
      : `${SEERR_URL}/api/v1/movie/${id}`;

  try {
    const res = await fetch(endpoint, {
      headers: { "X-Api-Key": SEERR_API_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      return NextResponse.json({ seasons: [], mediaStatus: 0, requestedSeasons: [] });
    }
    const data = await res.json();

    if (type === "tv") {
      const seasons = (data.seasons || [])
        .filter((s: RawSeason) => s.seasonNumber > 0)
        .map((s: RawSeason) => ({
          seasonNumber: s.seasonNumber,
          name: s.name || `Season ${s.seasonNumber}`,
          episodeCount: s.episodeCount || 0,
          airDate: s.airDate || null,
        }));

      // Seasons already available or requested
      const requestedSeasons: number[] = (data.mediaInfo?.seasons || [])
        .filter((s: RawMediaInfoSeason) => s.status && s.status > 1)
        .map((s: RawMediaInfoSeason) => s.seasonNumber);

      return NextResponse.json({
        seasons,
        mediaStatus: data.mediaInfo?.status ?? 0,
        requestedSeasons,
      });
    }

    return NextResponse.json({
      seasons: [],
      mediaStatus: data.mediaInfo?.status ?? 0,
      requestedSeasons: [],
    });
  } catch {
    return NextResponse.json({ seasons: [], mediaStatus: 0, requestedSeasons: [] });
  }
}
