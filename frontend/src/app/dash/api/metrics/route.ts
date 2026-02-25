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

    // Flexible parser — try multiple known field names
    const upload: number | null =
      data.upload ?? data.upload_total ?? data.uploaded ?? data.up ?? null;
    const download: number | null =
      data.download ?? data.download_total ?? data.downloaded ?? data.down ?? null;
    const diskUsed: number | null =
      data.disk_quota_used ?? data.disk_used ?? data.used ?? null;
    const diskTotal: number | null =
      data.disk_quota ?? data.disk_total ?? data.total ?? null;
    const diskFree: number | null =
      data.disk_free ?? data.free ??
      (diskTotal !== null && diskUsed !== null ? diskTotal - diskUsed : null);

    return NextResponse.json({
      upload,
      download,
      diskUsed,
      diskFree,
      diskTotal,
      uploadFormatted: upload !== null ? formatBytes(upload) : null,
      downloadFormatted: download !== null ? formatBytes(download) : null,
      diskUsedFormatted: diskUsed !== null ? formatBytes(diskUsed) : null,
      diskFreeFormatted: diskFree !== null ? formatBytes(diskFree) : null,
      diskTotalFormatted: diskTotal !== null ? formatBytes(diskTotal) : null,
      usedPercent:
        diskTotal && diskUsed ? Math.round((diskUsed / diskTotal) * 100) : null,
    });
  } catch {
    return NextResponse.json({ error: "unavailable" });
  }
}
