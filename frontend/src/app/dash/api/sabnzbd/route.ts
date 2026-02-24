import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SAB_URL = process.env.SAB_URL || "https://sabnzbd.cinenode.org";
const SAB_API_KEY = process.env.SAB_API_KEY || "";

async function sabFetch(mode: string, extra = "") {
  // Dedicated subdomain: API is at /api (not /sabnzbd/api)
  const url = `${SAB_URL}/api?mode=${mode}&apikey=${SAB_API_KEY}&output=json${extra}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    // SABnzbd returns {"status": false, "error": "..."} on API key mismatch
    if (data?.status === false) return null;
    return data;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export async function GET() {
  if (!SAB_API_KEY) {
    return NextResponse.json({ error: "SAB_API_KEY not configured" }, { status: 503 });
  }

  try {
    const [queueRaw, historyRaw, statsRaw] = await Promise.all([
      sabFetch("queue", "&limit=10"),
      sabFetch("history", "&limit=10"),
      sabFetch("server_stats"),
    ]);

    // Queue - active downloads
    const activeDownloads: Array<{
      name: string;
      size: string;
      progress: number;
      speed: string;
      timeLeft: string;
      status: string;
    }> = [];

    if (queueRaw?.queue) {
      const q = queueRaw.queue;
      for (const slot of q.slots || []) {
        activeDownloads.push({
          name: slot.filename || "Unknown",
          size: slot.size || "0 B",
          progress: Math.round(
            ((parseFloat(slot.mb) - parseFloat(slot.mbleft)) / Math.max(parseFloat(slot.mb), 0.01)) * 100
          ),
          speed: q.speed ? `${q.speed}` : "0",
          timeLeft: slot.timeleft || "",
          status: slot.status || "Downloading",
        });
      }
    }

    // Global speed — kbpersec is more reliable than the speed string field
    const speedBps = queueRaw?.queue?.kbpersec
      ? parseFloat(queueRaw.queue.kbpersec) * 1024
      : 0;
    const currentSpeed = speedBps > 0 ? formatBytes(speedBps) + "/s" : "0 B/s";

    // History - recent completed
    const recentHistory: Array<{
      name: string;
      size: string;
      status: string;
      completedAt: string;
    }> = [];

    if (historyRaw?.history) {
      for (const slot of historyRaw.history.slots || []) {
        recentHistory.push({
          name: slot.name || "Unknown",
          size: slot.size || "0 B",
          status: slot.status || "Completed",
          completedAt: slot.completed
            ? new Date(slot.completed * 1000).toISOString()
            : "",
        });
      }
    }

    // Server stats - monthly / total
    let monthTotal = 0;
    let totalBytes = 0;

    if (statsRaw) {
      // Server stats structure: { day_size, week_size, month_size, total_size, servers: {...} }
      if (statsRaw.month_size) monthTotal = statsRaw.month_size;
      if (statsRaw.total_size) totalBytes = statsRaw.total_size;
      else if (statsRaw.total) totalBytes = statsRaw.total;
    }

    // Queue stats
    const queueCount = queueRaw?.queue?.noofslots_total
      ? parseInt(queueRaw.queue.noofslots_total)
      : activeDownloads.length;

    const connected = queueRaw !== null || historyRaw !== null || statsRaw !== null;

    return NextResponse.json({
      connected,
      speed: currentSpeed,
      speedBps,
      queue: {
        count: queueCount,
        active: activeDownloads,
      },
      history: {
        recent: recentHistory.slice(0, 5),
        totalCompleted: historyRaw?.history?.noofslots
          ? parseInt(historyRaw.history.noofslots)
          : 0,
      },
      stats: {
        monthDownloaded: formatBytes(monthTotal),
        totalDownloaded: formatBytes(totalBytes),
      },
    });
  } catch {
    return NextResponse.json(
      { connected: false, speed: "0 B/s", speedBps: 0, queue: { count: 0, active: [] }, history: { recent: [], totalCompleted: 0 }, stats: { monthDownloaded: "0 B", totalDownloaded: "0 B" } },
      { status: 200 }
    );
  }
}
