import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BESZEL_URL = (process.env.BESZEL_URL || "https://beszel.fs0ciety.org").replace(/\/$/, "");
const BESZEL_USER = process.env.BESZEL_USER || "";
const BESZEL_PASS = process.env.BESZEL_PASS || "";

// Beszel stores info using abbreviated field names in PocketBase
interface BeszelRawInfo {
  cpu?: number;  // CPU percent
  m?: number;    // mem used (GiB)
  mp?: number;   // mem percent (pre-calculated)
  mt?: number;   // mem total (GiB)
  d?: Array<{ p: string; u: number; t: number }>; // disk: path, used GiB, total GiB
  b?: number;    // net recv bytes/s
  bs?: number;   // net sent bytes/s
  up?: number;   // uptime seconds
}

interface BeszelRecord {
  id: string;
  name: string;
  status: string;
  host: string;
  info?: BeszelRawInfo;
}

async function getToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BESZEL_URL}/api/collections/users/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ identity: BESZEL_USER, password: BESZEL_PASS }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

function formatNetBytes(b: number): string {
  if (b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), sizes.length - 1);
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export async function GET() {
  if (!BESZEL_USER || !BESZEL_PASS) {
    return NextResponse.json({ error: "Beszel credentials not configured" }, { status: 503 });
  }

  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Beszel auth failed" }, { status: 401 });
    }

    const res = await fetch(
      `${BESZEL_URL}/api/collections/systems/records?perPage=50&sort=name`,
      {
        headers: { Authorization: token, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Beszel unavailable" }, { status: 200 });
    }

    const data = await res.json();
    const systems: BeszelRecord[] = data.items ?? [];

    const result = systems.map((s) => {
      const info = s.info;
      const cpu = info?.cpu != null ? Math.round(info.cpu * 10) / 10 : null;

      // Memory: use pre-calculated percent (mp) or derive from m/mt
      const memPercent = info?.mp != null
        ? Math.round(info.mp)
        : (info?.m != null && info?.mt && info.mt > 0)
          ? Math.round((info.m / info.mt) * 100)
          : null;

      // Disk: use first entry in d array
      const mainDisk = info?.d?.[0];
      const diskPercent = mainDisk && mainDisk.t > 0
        ? Math.round((mainDisk.u / mainDisk.t) * 100)
        : null;
      const diskUsed = mainDisk ? `${mainDisk.u.toFixed(1)} GiB` : null;
      const diskTotal = mainDisk ? `${mainDisk.t.toFixed(1)} GiB` : null;

      const memUsed = info?.m != null ? `${info.m.toFixed(1)} GiB` : null;
      const memTotal = info?.mt != null ? `${info.mt.toFixed(1)} GiB` : null;

      return {
        id: s.id,
        name: s.name,
        status: s.status,
        cpu,
        memPercent,
        memUsed,
        memTotal,
        diskPercent,
        diskUsed,
        diskTotal,
        diskPath: mainDisk?.p ?? null,
        netRecv: info?.b != null ? formatNetBytes(info.b) + "/s" : null,
        netSent: info?.bs != null ? formatNetBytes(info.bs) + "/s" : null,
        uptime: info?.up != null ? formatUptime(info.up) : null,
      };
    });

    return NextResponse.json({ systems: result });
  } catch {
    return NextResponse.json({ systems: [], error: "unavailable" }, { status: 200 });
  }
}
