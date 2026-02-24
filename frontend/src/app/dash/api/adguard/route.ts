import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ADGUARD_URL = process.env.ADGUARD_URL || "http://100.74.40.4:3000";
const ADGUARD_USER = process.env.ADGUARD_USER || "";
const ADGUARD_PASS = process.env.ADGUARD_PASS || "";

function authHeaders(): HeadersInit {
  const h: HeadersInit = { Accept: "application/json" };
  if (ADGUARD_USER && ADGUARD_PASS) {
    h.Authorization = `Basic ${Buffer.from(`${ADGUARD_USER}:${ADGUARD_PASS}`).toString("base64")}`;
  }
  return h;
}

export async function GET() {
  try {
    const [statsRes, statusRes] = await Promise.allSettled([
      fetch(`${ADGUARD_URL}/control/stats`, { headers: authHeaders() }),
      fetch(`${ADGUARD_URL}/control/status`, { headers: authHeaders() }),
    ]);

    let stats: {
      totalQueries: number;
      blockedFiltering: number;
      avgProcessingTime: number;
      dnsQueries: number[];
      blockedSeries: number[];
      topBlocked: Array<{ domain: string; count: number }>;
    } | null = null;

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const raw = await statsRes.value.json();
      stats = {
        totalQueries: raw.num_dns_queries || 0,
        blockedFiltering: raw.num_blocked_filtering || 0,
        avgProcessingTime: raw.avg_processing_time || 0,
        dnsQueries: raw.dns_queries || [],
        blockedSeries: raw.blocked_filtering || [],
        topBlocked: (raw.top_blocked_domains || [])
          .slice(0, 5)
          .map((entry: Record<string, number>) => {
            const [domain, count] = Object.entries(entry)[0] || ["?", 0];
            return { domain, count };
          }),
      };
    }

    let running = false;
    if (statusRes.status === "fulfilled" && statusRes.value.ok) {
      const raw = await statusRes.value.json();
      running = raw.running ?? false;
    }

    return NextResponse.json({ stats, running });
  } catch {
    return NextResponse.json({ stats: null, running: false }, { status: 500 });
  }
}
