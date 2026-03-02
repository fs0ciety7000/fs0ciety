import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPTIME_URL = (process.env.UPTIME_URL || "https://status.fs0ciety.org").replace(/\/$/, "");
const UPTIME_API_KEY = process.env.UPTIME_API_KEY || "";

interface Monitor {
  id: number;
  name: string;
  active: boolean;
  heartbeat?: {
    status: number; // 0 = down, 1 = up
    msg?: string;
    time?: string;
    ping?: number;
  };
  uptime?: number; // percentage
}

export async function GET() {
  if (!UPTIME_API_KEY) {
    return NextResponse.json({ error: "UPTIME_API_KEY not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${UPTIME_URL}/api/status-page/heartbeat/default`, {
      headers: {
        Authorization: `ApiKey ${UPTIME_API_KEY}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Try alternative endpoint (public status page)
      const pubRes = await fetch(`${UPTIME_URL}/api/status-page/default`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!pubRes.ok) {
        return NextResponse.json({ monitors: [], error: "unavailable" }, { status: 200 });
      }
      const pubData = await pubRes.json().catch(() => null);
      if (!pubData) return NextResponse.json({ monitors: [], error: "unavailable" }, { status: 200 });

      // Public status page returns monitor list without heartbeats
      const monitors = (pubData.publicGroupList ?? []).flatMap((g: { monitorList?: Monitor[] }) =>
        (g.monitorList ?? []).map((m: Monitor) => ({
          id: m.id,
          name: m.name,
          status: 1,
          uptime: null,
          ping: null,
        }))
      );
      return NextResponse.json({ monitors });
    }

    const data = await res.json().catch(() => null);
    if (!data) return NextResponse.json({ monitors: [], error: "unavailable" }, { status: 200 });

    // Heartbeat endpoint returns { heartbeatList: { [id]: [...] }, uptimeList: { [id]_24: number } }
    const heartbeatList: Record<string, Array<{ status: number; ping?: number; time?: string }>> =
      data.heartbeatList ?? {};
    const uptimeList: Record<string, number> = data.uptimeList ?? {};

    // We also need monitor metadata — try monitors endpoint
    const monitorsRes = await fetch(`${UPTIME_URL}/api/monitor`, {
      headers: {
        Authorization: `ApiKey ${UPTIME_API_KEY}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);

    const monitorsData = monitorsRes?.ok ? await monitorsRes.json().catch(() => null) : null;
    const monitorMap: Record<string, string> = {};
    if (monitorsData?.monitors) {
      for (const m of monitorsData.monitors) {
        monitorMap[m.id] = m.name;
      }
    }

    const monitors = Object.entries(heartbeatList).map(([id, beats]) => {
      const latest = beats[beats.length - 1];
      const uptimeKey = `${id}_24`;
      return {
        id: parseInt(id),
        name: monitorMap[id] ?? `Monitor ${id}`,
        status: latest?.status ?? 0,
        uptime: uptimeList[uptimeKey] != null ? Math.round(uptimeList[uptimeKey] * 10) / 10 : null,
        ping: latest?.ping ?? null,
      };
    });

    return NextResponse.json({ monitors });
  } catch {
    return NextResponse.json({ monitors: [], error: "unavailable" }, { status: 200 });
  }
}
