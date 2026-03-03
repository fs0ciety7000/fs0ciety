import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IMMICH_URL = (process.env.IMMICH_URL || "https://photos.fs0ciety.org").replace(/\/$/, "");
const IMMICH_API_KEY = process.env.IMMICH_API_KEY || "";
// External/watched library ID — its usage isn't included in /api/server/statistics
const IMMICH_LIBRARY_ID = process.env.IMMICH_LIBRARY_ID || "d8cd06e1-ff6a-4a5b-bab7-73debf3b6213";

function immichHeaders(): HeadersInit {
  return { "x-api-key": IMMICH_API_KEY, Accept: "application/json" };
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
    const [statsRes, storageRes, libStatsRes] = await Promise.allSettled([
      fetch(`${IMMICH_URL}/api/server/statistics`, {
        headers: immichHeaders(), signal: AbortSignal.timeout(8000),
      }),
      fetch(`${IMMICH_URL}/api/server/storage`, {
        headers: immichHeaders(), signal: AbortSignal.timeout(8000),
      }),
      fetch(`${IMMICH_URL}/api/libraries/${IMMICH_LIBRARY_ID}/statistics`, {
        headers: immichHeaders(), signal: AbortSignal.timeout(8000),
      }),
    ]);

    // Prefer library-specific stats — /api/server/statistics excludes watched folder libraries
    let stats: { photos: number; videos: number; usage: string } | null = null;

    if (libStatsRes.status === "fulfilled" && libStatsRes.value.ok) {
      const lib = await libStatsRes.value.json();
      stats = {
        photos: lib.photos ?? 0,
        videos: lib.videos ?? 0,
        usage: formatBytes(typeof lib.usage === "number" ? lib.usage : 0),
      };
    } else if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      const data = await statsRes.value.json();
      stats = {
        photos: data.photos ?? 0,
        videos: data.videos ?? 0,
        usage: formatBytes(typeof data.usage === "number" ? data.usage : 0),
      };
    }

    let storage: { diskAvailable: string; diskUsed: string; diskSize: string; diskUsedPercent: number } | null = null;
    if (storageRes.status === "fulfilled" && storageRes.value.ok) {
      const data = await storageRes.value.json();
      const availableBytes = data.diskAvailableRaw ?? data.diskAvailable_raw ?? null;
      const totalBytes = data.diskSizeRaw ?? data.diskSize_raw ?? null;
      const usedBytes = (availableBytes != null && totalBytes != null) ? totalBytes - availableBytes : null;

      storage = {
        diskAvailable: availableBytes != null
          ? formatBytes(availableBytes)
          : (typeof data.diskAvailable === "string" ? data.diskAvailable : "—"),
        diskUsed: usedBytes != null
          ? formatBytes(usedBytes)
          : "—",
        diskSize: totalBytes != null
          ? formatBytes(totalBytes)
          : (typeof data.diskSize === "string" ? data.diskSize : "—"),
        diskUsedPercent: Math.round(data.diskUsagePercentage ?? 0),
      };
    }

    return NextResponse.json({ stats, storage });
  } catch {
    return NextResponse.json({ stats: null, storage: null }, { status: 500 });
  }
}
