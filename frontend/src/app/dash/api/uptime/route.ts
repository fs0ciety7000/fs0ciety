import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPTIME_URL = (process.env.UPTIME_URL || "https://status.fs0ciety.org").replace(/\/$/, "");
const UPTIME_API_KEY = process.env.UPTIME_API_KEY || "";
const STATUS_PAGE = process.env.UPTIME_STATUS_PAGE || "fs0ciety";

interface RawMonitor {
  id: number;
  name: string;
}

export async function GET() {
  if (!UPTIME_API_KEY) {
    return NextResponse.json({ error: "UPTIME_API_KEY not configured" }, { status: 503 });
  }

  try {
    // Fetch all three in parallel:
    // 1. Heartbeat data (public, gives status + uptime)
    // 2. Status page config (public, gives monitor names)
    // 3. Monitor list (auth, also gives names as fallback)
    const [heartbeatRes, statusPageRes, monitorsRes] = await Promise.allSettled([
      fetch(`${UPTIME_URL}/api/status-page/heartbeat/${STATUS_PAGE}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${UPTIME_URL}/api/status-page/${STATUS_PAGE}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${UPTIME_URL}/api/monitor`, {
        headers: { Authorization: `ApiKey ${UPTIME_API_KEY}`, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    // Build monitor name map — status page config is most reliable (public, no auth needed)
    const monitorMap: Record<number, string> = {};

    // From status page config (public)
    if (statusPageRes.status === "fulfilled" && statusPageRes.value.ok) {
      const spData = await statusPageRes.value.json().catch(() => null);
      for (const group of spData?.publicGroupList ?? []) {
        for (const m of group.monitorList ?? []) {
          if (m.id && m.name) monitorMap[m.id] = m.name;
        }
      }
    }

    // From authenticated monitor API (fills gaps if any)
    if (monitorsRes.status === "fulfilled" && monitorsRes.value.ok) {
      const data = await monitorsRes.value.json().catch(() => null);
      for (const m of (data?.monitors ?? []) as RawMonitor[]) {
        if (!monitorMap[m.id]) monitorMap[m.id] = m.name;
      }
    }

    // Heartbeat data
    let heartbeatList: Record<string, Array<{ status: number; ping?: number }>> = {};
    let uptimeList: Record<string, number> = {};

    if (heartbeatRes.status === "fulfilled" && heartbeatRes.value.ok) {
      const data = await heartbeatRes.value.json().catch(() => null);
      heartbeatList = data?.heartbeatList ?? {};
      uptimeList = data?.uptimeList ?? {};
    }

    const monitors = Object.entries(heartbeatList).map(([idStr, beats]) => {
      const id = parseInt(idStr);
      const latest = Array.isArray(beats) ? beats[beats.length - 1] : null;
      const uptimeKey = `${idStr}_24`;
      return {
        id,
        name: monitorMap[id] ?? `Monitor ${id}`,
        status: latest?.status ?? 0,
        uptime: uptimeList[uptimeKey] != null
          ? Math.round(uptimeList[uptimeKey] * 10) / 10
          : null,
        ping: latest?.ping ?? null,
      };
    });

    return NextResponse.json({ monitors });
  } catch {
    return NextResponse.json({ monitors: [], error: "unavailable" }, { status: 200 });
  }
}
