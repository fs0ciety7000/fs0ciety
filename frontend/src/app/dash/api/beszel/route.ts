import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BESZEL_URL = (process.env.BESZEL_URL || "https://beszel.fs0ciety.org").replace(/\/$/, "");
const BESZEL_USER = process.env.BESZEL_USER || "";
const BESZEL_PASS = process.env.BESZEL_PASS || "";

interface BeszelSystem {
  id: string;
  name: string;
  status: string;
  host: string;
  port: number;
  info?: {
    cpu: number;       // CPU usage %
    mem: number;       // RAM used GB
    mem_total: number; // RAM total GB
    disk: number;      // Disk used GB
    disk_total: number;// Disk total GB
    b_recv: number;    // bytes received/s
    b_sent: number;    // bytes sent/s
    uptime?: number;   // seconds
  };
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

function formatBytes(b: number): string {
  if (b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
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
        headers: {
          Authorization: token,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Beszel unavailable" }, { status: 200 });
    }

    const data = await res.json();
    const systems: BeszelSystem[] = data.items ?? [];

    const result = systems.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status, // "up" | "down" | "paused"
      host: s.host,
      cpu: s.info?.cpu != null ? Math.round(s.info.cpu * 10) / 10 : null,
      mem: s.info?.mem != null ? s.info.mem : null,
      memTotal: s.info?.mem_total != null ? s.info.mem_total : null,
      memPercent:
        s.info?.mem != null && s.info?.mem_total
          ? Math.round((s.info.mem / s.info.mem_total) * 100)
          : null,
      disk: s.info?.disk != null ? s.info.disk : null,
      diskTotal: s.info?.disk_total != null ? s.info.disk_total : null,
      diskPercent:
        s.info?.disk != null && s.info?.disk_total
          ? Math.round((s.info.disk / s.info.disk_total) * 100)
          : null,
      netRecv: s.info?.b_recv != null ? formatBytes(s.info.b_recv) + "/s" : null,
      netSent: s.info?.b_sent != null ? formatBytes(s.info.b_sent) + "/s" : null,
      uptime: s.info?.uptime != null ? formatUptime(s.info.uptime) : null,
    }));

    return NextResponse.json({ systems: result });
  } catch {
    return NextResponse.json({ systems: [], error: "unavailable" }, { status: 200 });
  }
}
