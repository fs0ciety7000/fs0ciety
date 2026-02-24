import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROWLARR_URL = process.env.PROWLARR_URL || "https://prowlarr.cinenode.org";
const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY || "2ba0202cdd8c491fb2476d88d90670d0";

function headers(): HeadersInit {
  return { "X-Api-Key": PROWLARR_API_KEY, Accept: "application/json" };
}

interface IndexerStat {
  indexerId: number;
  indexerName: string;
  averageResponseTime: number;
  numberOfQueries: number;
  numberOfGrabs: number;
  numberOfRssQueries: number;
  numberOfAuthQueries: number;
  numberOfFailedQueries: number;
  numberOfFailedGrabs: number;
  numberOfFailedRssQueries: number;
  numberOfFailedAuthQueries: number;
}

interface StatsResponse {
  indexers: IndexerStat[];
}

export async function GET() {
  try {
    const [statsRes, indexersRes] = await Promise.allSettled([
      fetch(`${PROWLARR_URL}/api/v1/indexerstats`, { headers: headers() }),
      fetch(`${PROWLARR_URL}/api/v1/indexer`, { headers: headers() }),
    ]);

    if (statsRes.status !== "fulfilled" || !statsRes.value.ok) {
      return NextResponse.json({ error: "Unable to reach Prowlarr" }, { status: 503 });
    }

    const raw: StatsResponse = await statsRes.value.json();

    // Build set of enabled indexer names
    const enabledNames = new Set<string>();
    if (indexersRes.status === "fulfilled" && indexersRes.value.ok) {
      const list: Array<{ id: number; name: string; enable: boolean }> = await indexersRes.value.json();
      for (const idx of list) {
        if (idx.enable) enabledNames.add(idx.name);
      }
    }

    const indexers = (raw.indexers || [])
      .filter((idx) => enabledNames.size === 0 || enabledNames.has(idx.indexerName))
      .sort((a, b) => b.numberOfQueries - a.numberOfQueries)
      .slice(0, 12)
      .map((idx) => {
        const totalQueries = idx.numberOfQueries + idx.numberOfRssQueries;
        const failedQueries = idx.numberOfFailedQueries + idx.numberOfFailedRssQueries;
        const failRate = totalQueries > 0 ? Math.round((failedQueries / totalQueries) * 100) : 0;
        return {
          id: idx.indexerId,
          name: idx.indexerName,
          queries: idx.numberOfQueries,
          grabs: idx.numberOfGrabs,
          rss: idx.numberOfRssQueries,
          failedQueries,
          failRate,
          avgMs: Math.round(idx.averageResponseTime),
        };
      });

    const totals = {
      queries: indexers.reduce((s, i) => s + i.queries, 0),
      grabs: indexers.reduce((s, i) => s + i.grabs, 0),
      failed: indexers.reduce((s, i) => s + i.failedQueries, 0),
      indexerCount: raw.indexers?.length || 0,
    };

    return NextResponse.json({ indexers, totals });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
