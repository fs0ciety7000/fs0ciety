import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── Jellyfin ────────────────────────────────────────────────
const JELLYFIN_URL = process.env.JELLYFIN_URL || "https://jellyfin.cinenode.org";
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || "";

interface JellyfinSession {
  Id: string;
  UserName: string;
  DeviceName: string;
  Client: string;
  NowPlayingItem?: {
    Id: string;
    Name: string;
    SeriesName?: string;
    Type: string;
    RunTimeTicks?: number;
    ImageTags?: { Primary?: string };
    ParentBackdropItemId?: string;
  };
  PlayState?: { PositionTicks?: number; IsPaused: boolean };
}

// ── Plex ─────────────────────────────────────────────────────
const PLEX_URL =
  process.env.PLEX_URL ||
  "https://185-203-56-82.c92770c35f2f4a72a1ad6b1e8f07da83.plex.direct:18825";
const PLEX_TOKEN = process.env.PLEX_TOKEN || "r5NL-YGRroXoxyRpN8nk";

interface PlexMetadata {
  ratingKey: string;
  title: string;
  type: string;
  thumb?: string;
  grandparentTitle?: string;
  grandparentThumb?: string;
  viewOffset?: number;
  duration?: number;
  User?: { title: string };
  Player?: { title: string; state?: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mc(raw: unknown): any {
  return (raw as { MediaContainer?: unknown })?.MediaContainer;
}

export interface NowPlayingItem {
  source: "jellyfin" | "plex";
  user: string;
  device: string;
  title: string;
  seriesName?: string;
  type: string;
  progress: number;
  isPaused: boolean;
  imageUrl: string | null;
  thumbUrl: string | null; // larger image for the dedicated section
}

export async function GET() {
  const items: NowPlayingItem[] = [];

  const [jellyfinRes, plexRes] = await Promise.allSettled([
    JELLYFIN_API_KEY
      ? fetch(`${JELLYFIN_URL}/Sessions`, {
          headers: { "X-Emby-Token": JELLYFIN_API_KEY, Accept: "application/json" },
        })
      : Promise.reject("no key"),
    fetch(`${PLEX_URL}/status/sessions`, {
      headers: { "X-Plex-Token": PLEX_TOKEN, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    }),
  ]);

  // Jellyfin sessions
  if (jellyfinRes.status === "fulfilled" && jellyfinRes.value.ok) {
    const sessions: JellyfinSession[] = await jellyfinRes.value.json();
    for (const s of sessions.filter((s) => s.NowPlayingItem)) {
      const item = s.NowPlayingItem!;
      const pos = s.PlayState?.PositionTicks || 0;
      const dur = item.RunTimeTicks || 1;
      const progress = Math.round((pos / dur) * 100);
      const thumbId = item.ImageTags?.Primary ? item.Id : (item.ParentBackdropItemId || "");
      items.push({
        source: "jellyfin",
        user: s.UserName,
        device: s.DeviceName,
        title: item.Name,
        seriesName: item.SeriesName,
        type: item.Type,
        progress,
        isPaused: s.PlayState?.IsPaused ?? false,
        imageUrl: thumbId
          ? `${JELLYFIN_URL}/Items/${thumbId}/Images/Primary?maxHeight=300&api_key=${JELLYFIN_API_KEY}`
          : null,
        thumbUrl: thumbId
          ? `${JELLYFIN_URL}/Items/${thumbId}/Images/Primary?maxHeight=600&api_key=${JELLYFIN_API_KEY}`
          : null,
      });
    }
  }

  // Plex sessions
  if (plexRes.status === "fulfilled" && plexRes.value.ok) {
    const data = await plexRes.value.json();
    const sessions: PlexMetadata[] = mc(data)?.Metadata || [];
    for (const s of sessions) {
      const progress = Math.round(
        ((s.viewOffset || 0) / Math.max(s.duration || 1, 1)) * 100
      );
      const thumb = s.grandparentThumb || s.thumb;
      items.push({
        source: "plex",
        user: s.User?.title || "Unknown",
        device: s.Player?.title || "",
        title: s.title,
        seriesName: s.grandparentTitle,
        type: s.type,
        progress,
        isPaused: s.Player?.state === "paused",
        imageUrl: thumb ? `${PLEX_URL}${thumb}?X-Plex-Token=${PLEX_TOKEN}` : null,
        thumbUrl: thumb ? `${PLEX_URL}${thumb}?X-Plex-Token=${PLEX_TOKEN}` : null,
      });
    }
  }

  return NextResponse.json({ items });
}
