import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UPTIME_URL = (process.env.UPTIME_URL || "https://status.fs0ciety.org").replace(/\/$/, "");
const UPTIME_API_KEY = process.env.UPTIME_API_KEY || "";
// Set UPTIME_STATUS_PAGE to match your slug (visible in the URL /status/{slug})
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
    // Fetch monitor names (auth) + heartbeat for configured slug (public) in parallel
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
      for (const m of (data?.monitors ?? []) as RawMonitor[]) {
        monitorMap[m.id] = m.name;
        allMonitorIds.push(m.id);
      }
    }

    // Heartbeat data from public status page
    let heartbeatList: Record<string, Array<{ status: number; ping?: number }>> = {};
    let uptimeList: Record<string, number> = {};
    let heartbeatError: string | null = null;

    if (heartbeatRes.status === "fulfilled") {
      if (heartbeatRes.value.ok) {
        const data = await heartbeatRes.value.json().catch(() => null);
        heartbeatList = data?.heartbeatList ?? {};
        uptimeList = data?.uptimeList ?? {};
      } else {
        heartbeatError = `HTTP ${heartbeatRes.value.status}`;
      }
    } else {
      heartbeatError = heartbeatRes.reason?.message ?? "timeout";
    }

    const monitors: Array<{
      id: number;
      name: string;
      status: number;
      uptime: number | null;
      ping: number | null;
    }> = [];

    const seenIds = new Set<number>();

    // Monitors on status page (have heartbeat data)
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

    // Monitors from API not on status page → status unknown (-1)
    for (const id of allMonitorIds) {
      if (!seenIds.has(id)) {
        monitors.push({ id, name: monitorMap[id], status: -1, uptime: null, ping: null });
      }
    }

    const diagnostics = monitors.length === 0
      ? { slug: STATUS_PAGE, heartbeatError, monitorsFromApi: allMonitorIds.length }
      : undefined;

    return NextResponse.json({ monitors, ...(diagnostics ? { diagnostics } : {}) });
  } catch {
    return NextResponse.json({ monitors: [], error: "unavailable" }, { status: 200 });
  }
}
