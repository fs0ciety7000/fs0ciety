import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BESZEL_URL = (process.env.BESZEL_URL || "https://beszel.fs0ciety.org").replace(/\/$/, "");
const BESZEL_USER = process.env.BESZEL_USER || "";
const BESZEL_PASS = process.env.BESZEL_PASS || "";

// Beszel stores info using abbreviated field names in PocketBase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeszelRawInfo = Record<string, any>;

interface BeszelRecord {
  id: string;
  name: string;
  status: string;
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
  if (!b || b <= 0) return "0 B";
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

// Try to extract a disk percent from the raw info, handling multiple possible formats
function extractDisk(info: BeszelRawInfo): {
  diskPercent: number | null;
  diskUsed: string | null;
  diskTotal: string | null;
  diskPath: string | null;
} {
  // Convention 1: d[] array with {p, u, t} fields (GiB values)
  if (Array.isArray(info.d) && info.d.length > 0) {
    const d0 = info.d[0];
    const u = d0.u ?? d0.used ?? d0.du;
    const t = d0.t ?? d0.total ?? d0.dt ?? d0.size;
    const f = d0.f ?? d0.free ?? d0.df;
    const p = d0.p ?? d0.path ?? "/";

    if (u != null && t != null && t > 0) {
      return {
        diskPercent: Math.round((u / t) * 100),
        diskUsed: `${(+u).toFixed(1)} GiB`,
        diskTotal: `${(+t).toFixed(1)} GiB`,
        diskPath: p,
      };
    }
    if (f != null && t != null && t > 0) {
      const used = t - f;
      return {
        diskPercent: Math.round((used / t) * 100),
        diskUsed: `${used.toFixed(1)} GiB`,
        diskTotal: `${(+t).toFixed(1)} GiB`,
        diskPath: p,
      };
    }
  }

  // Convention 2: pre-calculated percent fields at top level
  const dp = info.dp ?? info.disk_pct ?? info.diskPct;
  if (dp != null) {
    const du = info.du ?? info.disk_used ?? info.diskUsed;
    const dt = info.dt ?? info.disk_total ?? info.diskTotal;
    return {
      diskPercent: Math.round(+dp),
      diskUsed: du != null ? `${(+du).toFixed(1)} GiB` : null,
      diskTotal: dt != null ? `${(+dt).toFixed(1)} GiB` : null,
      diskPath: info.dp_path ?? null,
    };
  }

  // Convention 3: separate top-level disk fields
  const diskUsed = info.disk ?? info.disk_used ?? info.du;
  const diskTotal = info.disk_total ?? info.dt ?? info.disk_size;
  if (diskUsed != null && diskTotal != null && diskTotal > 0) {
    return {
      diskPercent: Math.round((+diskUsed / +diskTotal) * 100),
      diskUsed: `${(+diskUsed).toFixed(1)} GiB`,
      diskTotal: `${(+diskTotal).toFixed(1)} GiB`,
      diskPath: null,
    };
  }

  return { diskPercent: null, diskUsed: null, diskTotal: null, diskPath: null };
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
      const info: BeszelRawInfo = s.info ?? {};

      // CPU
      const cpu = info.cpu != null ? Math.round(+info.cpu * 10) / 10 : null;

      // Memory — use pre-calculated percent (mp) or derive from m/mt
      const memPercent = info.mp != null
        ? Math.round(+info.mp)
        : (info.m != null && info.mt && +info.mt > 0)
          ? Math.round((+info.m / +info.mt) * 100)
          : null;
      const memUsed = info.m != null ? `${(+info.m).toFixed(1)} GiB` : null;
      const memTotal = info.mt != null ? `${(+info.mt).toFixed(1)} GiB` : null;

      // Disk — try all known field name conventions
      const { diskPercent, diskUsed, diskTotal, diskPath } = extractDisk(info);

      // Network
      const netRecv = info.b != null ? formatNetBytes(+info.b) + "/s" : null;
      const netSent = info.bs != null ? formatNetBytes(+info.bs) + "/s" : null;

      // Uptime
      const uptime = info.up != null ? formatUptime(+info.up) : null;

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
        diskPath,
        netRecv,
        netSent,
        uptime,
        // Debug: expose raw info keys so we can identify missing disk fields
        _infoKeys: Object.keys(info),
      };
    });

    return NextResponse.json({ systems: result });
  } catch {
    return NextResponse.json({ systems: [], error: "unavailable" }, { status: 200 });
  }
}
