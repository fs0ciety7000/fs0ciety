import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ABS_URL = (process.env.AUDIOBOOKSHELF_URL || "https://audio.cinenode.org").replace(/\/$/, "");
const ABS_TOKEN = process.env.AUDIOBOOKSHELF_TOKEN || "";

function absHeaders(): HeadersInit {
  return { Authorization: `Bearer ${ABS_TOKEN}`, Accept: "application/json" };
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

function formatBytes(b: number): string {
  if (!b || b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export async function GET() {
  if (!ABS_TOKEN) {
    return NextResponse.json({ error: "AUDIOBOOKSHELF_TOKEN not configured" }, { status: 503 });
  }

  try {
    // Get all libraries
    const libsRes = await fetch(`${ABS_URL}/api/libraries`, {
      headers: absHeaders(),
      signal: AbortSignal.timeout(8000),
    });

    if (!libsRes.ok) {
      return NextResponse.json({ error: `ABS error ${libsRes.status}` }, { status: 200 });
    }

    const libsData = await libsRes.json();
    const libraries: Array<{ id: string; name: string; mediaType: string }> =
      libsData.libraries ?? [];

    // For each library: fetch stats + recent items in parallel
    const results = await Promise.all(
      libraries.map(async (lib) => {
        const [statsRes, itemsRes] = await Promise.allSettled([
          fetch(`${ABS_URL}/api/libraries/${lib.id}/stats`, {
            headers: absHeaders(),
            signal: AbortSignal.timeout(8000),
          }),
          fetch(
            `${ABS_URL}/api/libraries/${lib.id}/items?limit=6&sort=addedAt&desc=1&minified=1`,
            { headers: absHeaders(), signal: AbortSignal.timeout(8000) }
          ),
        ]);

        let totalItems = 0;
        let totalDuration = "";
        let totalSize = "";

        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const s = await statsRes.value.json().catch(() => null);
          totalItems = s?.totalItems ?? 0;
          totalDuration = s?.totalDuration ? formatDuration(s.totalDuration) : "";
          totalSize = s?.totalSize ? formatBytes(s.totalSize) : "";
        }

        const recentItems: Array<{
          id: string;
          title: string;
          author: string | null;
          duration: string;
          addedAt: number;
          coverUrl: string;
        }> = [];

        if (itemsRes.status === "fulfilled" && itemsRes.value.ok) {
          const d = await itemsRes.value.json().catch(() => null);
          if (!totalItems && d?.total) totalItems = d.total;

          for (const item of (d?.results ?? []).slice(0, 6)) {
            const meta = item.media?.metadata ?? item.mediaMetadata ?? {};
            recentItems.push({
              id: item.id,
              title: meta.title ?? meta.titleIgnorePrefix ?? "Unknown",
              author: meta.authorName ?? meta.author ?? null,
              duration: item.media?.duration ? formatDuration(item.media.duration) : "",
              addedAt: item.addedAt ?? 0,
              // Token embedded in URL so browser can load the image directly
              coverUrl: `${ABS_URL}/api/items/${item.id}/cover?token=${ABS_TOKEN}&width=80&height=80`,
            });
          }
        }

        return {
          id: lib.id,
          name: lib.name,
          mediaType: lib.mediaType,
          totalItems,
          totalDuration,
          totalSize,
          recentItems,
        };
      })
    );

    return NextResponse.json({ libraries: results });
  } catch {
    return NextResponse.json({ libraries: [], error: "unavailable" }, { status: 200 });
  }
}
