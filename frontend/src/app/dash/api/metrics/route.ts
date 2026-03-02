import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WHATBOX_URL = "https://zucchini.whatbox.ca/labs/stats?json=1";
const WHATBOX_USER = process.env.WHATBOX_USER || "";
const WHATBOX_PASS = process.env.WHATBOX_PASS || "";

function formatBytes(b: number): string {
  if (!b || b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(Math.abs(b)) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

interface WhatboxMemory {
  mem_total?: number;
  mem_used?: number;
  mem_cached?: number;
  swap_total?: number;
  swap_used?: number;
}

interface WhatboxCpuCore {
  user: string;
  nice: string;
  system: string;
  idle: string;
}

interface WhatboxDisk {
  total?: number;
  used?: number;
  free?: number;
  // alternative field names
  size?: number;
  available?: number;
}

export async function GET() {
  try {
    const headers: HeadersInit = { Accept: "application/json" };
    if (WHATBOX_USER && WHATBOX_PASS) {
      headers.Authorization =
        "Basic " + Buffer.from(`${WHATBOX_USER}:${WHATBOX_PASS}`).toString("base64");
    }

    const res = await fetch(WHATBOX_URL, {
      headers,
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "unavailable" });
    }

    const data = await res.json();

    // Memory
    const mem: WhatboxMemory = data.memory ?? {};
    const memTotal = mem.mem_total ?? null;
    const memUsed = mem.mem_used ?? null;
    const memCached = mem.mem_cached ?? null;
    const memFree = memTotal !== null && memUsed !== null ? memTotal - memUsed : null;
    const memPercent = memTotal && memUsed ? Math.round((memUsed / memTotal) * 100) : null;

    // CPU — cumulative busy % since boot (not instantaneous)
    const cpuCores = Array.isArray(data.cpu) ? (data.cpu as WhatboxCpuCore[]).length : null;
    let cpuBusyPercent: number | null = null;
    if (Array.isArray(data.cpu) && data.cpu.length > 0) {
      let totalBusy = 0, totalAll = 0;
      for (const core of data.cpu as WhatboxCpuCore[]) {
        const user = parseInt(core.user) || 0;
        const nice = parseInt(core.nice) || 0;
        const system = parseInt(core.system) || 0;
        const idle = parseInt(core.idle) || 0;
        totalBusy += user + nice + system;
        totalAll += user + nice + system + idle;
      }
      cpuBusyPercent = totalAll > 0 ? Math.round((totalBusy / totalAll) * 100) : null;
    }

    // Disk — try multiple possible keys from Whatbox stats
    let diskFree: number | null = null;
    let diskTotal: number | null = null;
    let diskUsedPercent: number | null = null;

    const diskSrc: WhatboxDisk = data.disk ?? data.storage ?? data.filesystem ?? {};
    const rawFree = diskSrc.free ?? diskSrc.available ?? null;
    const rawTotal = diskSrc.total ?? diskSrc.size ?? null;
    const rawUsed = diskSrc.used ?? null;

    if (rawTotal && rawTotal > 0) {
      diskTotal = rawTotal;
      if (rawFree != null) {
        diskFree = rawFree;
        diskUsedPercent = Math.round(((rawTotal - rawFree) / rawTotal) * 100);
      } else if (rawUsed != null) {
        diskFree = rawTotal - rawUsed;
        diskUsedPercent = Math.round((rawUsed / rawTotal) * 100);
      }
    }

    return NextResponse.json({
      memTotal,
      memUsed,
      memCached,
      memFree,
      memPercent,
      memTotalFormatted: memTotal !== null ? formatBytes(memTotal) : null,
      memUsedFormatted: memUsed !== null ? formatBytes(memUsed) : null,
      memCachedFormatted: memCached !== null ? formatBytes(memCached) : null,
      memFreeFormatted: memFree !== null ? formatBytes(memFree) : null,
      cpuCores,
      cpuBusyPercent,
      // Disk from Whatbox stats (null if not provided by API)
      diskFree: diskFree !== null ? formatBytes(diskFree) : null,
      diskTotal: diskTotal !== null ? formatBytes(diskTotal) : null,
      diskUsedPercent,
    });
  } catch {
    return NextResponse.json({ error: "unavailable" });
  }
}
