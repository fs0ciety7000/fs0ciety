import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RADARR_URL = process.env.RADARR_URL || "https://radarr.cinenode.org";
const RADARR_API_KEY = process.env.RADARR_API_KEY || "d504f9d499a44007a0835c41a904644a";

function radarrHeaders(): HeadersInit {
  return { "X-Api-Key": RADARR_API_KEY, Accept: "application/json" };
}

interface RadarrMovie {
  id: number;
  monitored: boolean;
  hasFile: boolean;
  status: string;
}

interface RadarrDiskSpace {
  path: string;
  label: string;
  freeSpace: number;
  totalSpace: number;
}

function formatBytes(b: number): string {
  if (b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export async function GET() {
  try {
    const [moviesRes, diskRes] = await Promise.allSettled([
      fetch(`${RADARR_URL}/api/v3/movie`, { headers: radarrHeaders() }),
      fetch(`${RADARR_URL}/api/v3/diskspace`, { headers: radarrHeaders() }),
    ]);

    let stats: {
      total: number;
      monitored: number;
      withFile: number;
      missing: number;
    } | null = null;

    if (moviesRes.status === "fulfilled" && moviesRes.value.ok) {
      const movies: RadarrMovie[] = await moviesRes.value.json();
      const monitored = movies.filter((m) => m.monitored);
      const withFile = movies.filter((m) => m.hasFile);
      const missing = monitored.filter((m) => !m.hasFile && m.status === "released");
      stats = {
        total: movies.length,
        monitored: monitored.length,
        withFile: withFile.length,
        missing: missing.length,
      };
    }

    let diskspace: Array<{
      path: string;
      label: string;
      freeSpace: string;
      totalSpace: string;
      usedPercent: number;
    }> = [];

    if (diskRes.status === "fulfilled" && diskRes.value.ok) {
      const disks: RadarrDiskSpace[] = await diskRes.value.json();
      diskspace = disks.map((d) => ({
        path: d.path,
        label: d.label || d.path,
        freeSpace: formatBytes(d.freeSpace),
        totalSpace: formatBytes(d.totalSpace),
        usedPercent:
          d.totalSpace > 0
            ? Math.round(((d.totalSpace - d.freeSpace) / d.totalSpace) * 100)
            : 0,
      }));
    }

    return NextResponse.json({ stats, diskspace });
  } catch {
    return NextResponse.json({ stats: null, diskspace: [] }, { status: 500 });
  }
}
