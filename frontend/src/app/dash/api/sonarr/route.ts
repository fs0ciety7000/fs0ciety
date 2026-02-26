import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SONARR_URL = process.env.SONARR_URL || "https://sonic.phantomhex.cc";
const SONARR_API_KEY = process.env.SONARR_API_KEY || "";

function sonarrHeaders(): HeadersInit {
  return { "X-Api-Key": SONARR_API_KEY, Accept: "application/json" };
}

interface SonarrSeries {
  id: number;
  monitored: boolean;
  statistics: {
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
  };
}

export async function GET() {
  try {
    const res = await fetch(`${SONARR_URL}/api/v3/series`, {
      headers: sonarrHeaders(),
    });

    if (!res.ok) {
      return NextResponse.json({ stats: null }, { status: res.status });
    }

    const series: SonarrSeries[] = await res.json();
    const monitored = series.filter((s) => s.monitored);

    const totalEpisodes = series.reduce(
      (sum, s) => sum + (s.statistics?.episodeCount || 0),
      0
    );
    const downloadedEpisodes = series.reduce(
      (sum, s) => sum + (s.statistics?.episodeFileCount || 0),
      0
    );
    const missingEpisodes = monitored.reduce((sum, s) => {
      const count =
        (s.statistics?.episodeCount || 0) - (s.statistics?.episodeFileCount || 0);
      return sum + Math.max(0, count);
    }, 0);

    return NextResponse.json({
      stats: {
        total: series.length,
        monitored: monitored.length,
        episodes: totalEpisodes,
        downloaded: downloadedEpisodes,
        missing: missingEpisodes,
      },
    });
  } catch {
    return NextResponse.json({ stats: null }, { status: 500 });
  }
}
