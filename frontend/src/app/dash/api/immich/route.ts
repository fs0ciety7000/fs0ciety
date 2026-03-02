import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IMMICH_URL = (process.env.IMMICH_URL || "https://photos.fs0ciety.org").replace(/\/$/, "");
const IMMICH_API_KEY = process.env.IMMICH_API_KEY || "";

function immichHeaders(): HeadersInit {
  return {
    "x-api-key": IMMICH_API_KEY,
    Accept: "application/json",
  };
}

function formatBytes(b: number): string {
  if (b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export async function GET() {
  if (!IMMICH_API_KEY) {
    return NextResponse.json({ error: "IMMICH_API_KEY not configured" }, { status: 503 });
  }

  try {
    const [statsRes, storageRes] = await Promise.allSettled([
      fetch(`${IMMICH_URL}/api/server/statistics`, {
        headers: immichHeaders(),
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`${IMMICH_URL}/api/server/storage`, {
        headers: immichHeaders(),
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    let stats: {
      photos: number;
      videos: number;
      usage: string;
    } | null = null;

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const data = await statsRes.value.json();
      stats = {
        photos: data.photos ?? 0,
        videos: data.videos ?? 0,
        usage: formatBytes(data.usage ?? 0),
      };
    }

    let storage: {
      diskAvailable: string;
      diskSize: string;
      diskUsedPercent: number;
    } | null = null;

    if (storageRes.status === "fulfilled" && storageRes.value.ok) {
      const data = await storageRes.value.json();
      storage = {
        diskAvailable: formatBytes(data.diskAvailable ?? 0),
        diskSize: formatBytes(data.diskSize ?? 0),
        diskUsedPercent: data.diskUsagePercentage ?? 0,
      };
    }

    return NextResponse.json({ stats, storage });
  } catch {
    return NextResponse.json({ stats: null, storage: null }, { status: 500 });
  }
}
