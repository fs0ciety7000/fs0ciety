import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPTIME_URL = (process.env.UPTIME_URL || "https://status.fs0ciety.org").replace(/\/$/, "");
const UPTIME_API_KEY = process.env.UPTIME_API_KEY || "";
// Status page slug — set UPTIME_STATUS_PAGE env var if yours isn't "default"
const STATUS_PAGE = process.env.UPTIME_STATUS_PAGE || "default";

interface RawMonitor {
  id: number;
  name: string;
  active: number | boolean;
}

export async function GET() {
  if (!UPTIME_API_KEY) {
    return NextResponse.json({ error: "UPTIME_API_KEY not configured" }, { status: 503 });
  }

  try {
    // Fetch monitor list (auth) + status page heartbeat (public) in parallel
    const [monitorsRes, heartbeatRes] = await Promise.allSettled([
      fetch(`${UPTIME_URL}/api/monitor`, {
        headers: { Authorization: `ApiKey ${UPTIME_API_KEY}`, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${UPTIME_URL}/api/status-page/heartbeat/${STATUS_PAGE}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    // Monitor names from authenticated API
    const monitorMap: Record<number, string> = {};
    let allMonitorIds: number[] = [];

    if (monitorsRes.status === "fulfilled" && monitorsRes.value.ok) {
      const data = await monitorsRes.value.json().catch(() => null);
      const monitors: RawMonitor[] = data?.monitors ?? [];
      for (const m of monitors) {
        monitorMap[m.id] = m.name;
        allMonitorIds.push(m.id);
      }
    }

    // Heartbeat data from public status page
    let heartbeatList: Record<string, Array<{ status: number; ping?: number }>> = {};
    let uptimeList: Record<string, number> = {};

    if (heartbeatRes.status === "fulfilled" && heartbeatRes.value.ok) {
      const data = await heartbeatRes.value.json().catch(() => null);
      heartbeatList = data?.heartbeatList ?? {};
      uptimeList = data?.uptimeList ?? {};
    }

    // Build result: prefer heartbeat data for monitors on the status page,
    // then include remaining monitors from the API (status unknown)
    const seenIds = new Set<number>();
    const monitors: Array<{
      id: number;
      name: string;
      status: number;
      uptime: number | null;
      ping: number | null;
    }> = [];

    // Monitors with heartbeat data (on status page)
    for (const [idStr, beats] of Object.entries(heartbeatList)) {
      const id = parseInt(idStr);
      seenIds.add(id);
      const latest = Array.isArray(beats) ? beats[beats.length - 1] : null;
      const uptimeKey = `${idStr}_24`;
      monitors.push({
        id,
        name: monitorMap[id] ?? `Monitor ${id}`,
        status: latest?.status ?? 0,
        uptime: uptimeList[uptimeKey] != null
          ? Math.round(uptimeList[uptimeKey] * 10) / 10
          : null,
        ping: latest?.ping ?? null,
      });
    }

    // Remaining monitors from API (not on status page) — show with status -1 (unknown)
    for (const id of allMonitorIds) {
      if (!seenIds.has(id)) {
        monitors.push({
          id,
          name: monitorMap[id] ?? `Monitor ${id}`,
          status: -1,
          uptime: null,
          ping: null,
        });
      }
    }

    return NextResponse.json({ monitors });
  } catch {
    return NextResponse.json({ monitors: [], error: "unavailable" }, { status: 200 });
  }
}
