import { NextResponse } from "next/server";
import { PLEX_TOKEN, PLEX_URL, plexHeaders } from "../plex/config";

export const dynamic = "force-dynamic";

const JELLYFIN_URL = process.env.JELLYFIN_URL || "https://jf.phantomhex.cc";
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || "";

interface PlexItem {
  ratingKey: string;
  title: string;
  type: string;
  thumb?: string;
  grandparentThumb?: string;
  grandparentTitle?: string;
  viewOffset?: number;
  duration?: number;
  lastViewedAt?: number | string;
}

interface JellyfinItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesName?: string;
  SeriesId?: string;
  RunTimeTicks?: number;
  ImageTags?: { Primary?: string };
  UserData?: { PlaybackPositionTicks?: number; LastPlayedDate?: string };
}

interface ResumeItem {
  id: string;
  source: "plex" | "jellyfin";
  title: string;
  subtitle: string;
  type: string;
  progress: number;
  remaining: string;
  imageUrl: string | null;
  href: string;
  lastPlayed: number;
}

function formatRemaining(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} h ${remainder} min restantes` : `${minutes} min restantes`;
}

function toResumeItem(args: Omit<ResumeItem, "remaining" | "progress" | "lastPlayed"> & {
  positionMs: number;
  durationMs: number;
  lastPlayed: number;
}): ResumeItem | null {
  if (!args.durationMs || args.durationMs <= 0) return null;
  const progress = Math.round((args.positionMs / args.durationMs) * 100);
  if (progress < 2 || progress >= 95) return null;
  return {
    ...args,
    progress,
    remaining: formatRemaining(args.durationMs - args.positionMs),
  };
}

async function fetchJson(url: string, headers: HeadersInit): Promise<unknown | null> {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(7000), cache: "no-store" });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

function plexContainer(raw: unknown): { MediaContainer?: { Metadata?: PlexItem[]; machineIdentifier?: string } } {
  return raw as { MediaContainer?: { Metadata?: PlexItem[]; machineIdentifier?: string } };
}

async function getPlexResume(): Promise<ResumeItem[]> {
  if (!PLEX_TOKEN) return [];
  const headers = plexHeaders();
  const [onDeckRaw, identityRaw] = await Promise.all([
    fetchJson(`${PLEX_URL}/library/onDeck?X-Plex-Container-Size=12`, headers),
    fetchJson(`${PLEX_URL}/identity`, headers),
  ]);
  const items = plexContainer(onDeckRaw).MediaContainer?.Metadata || [];
  const machineId = plexContainer(identityRaw).MediaContainer?.machineIdentifier || "";

  return items.flatMap((item) => {
    const thumb = item.grandparentThumb || item.thumb;
    const imageUrl = thumb?.startsWith("/library/metadata/")
      ? `/dash/api/plex/image?path=${encodeURIComponent(thumb)}`
      : null;
    const result = toResumeItem({
      id: `plex-${item.ratingKey}`,
      source: "plex",
      title: item.grandparentTitle || item.title,
      subtitle: item.grandparentTitle ? item.title : item.type === "movie" ? "Film" : "À reprendre",
      type: item.type,
      positionMs: item.viewOffset || 0,
      durationMs: item.duration || 0,
      imageUrl,
      href: machineId
        ? `https://app.plex.tv/desktop/#!/server/${machineId}/details?key=/library/metadata/${item.ratingKey}`
        : "https://app.plex.tv/desktop",
      lastPlayed: Number(item.lastViewedAt || 0) * 1000,
    });
    return result ? [result] : [];
  });
}

async function getJellyfinResume(): Promise<ResumeItem[]> {
  if (!JELLYFIN_API_KEY) return [];
  const headers = { "X-Emby-Token": JELLYFIN_API_KEY, Accept: "application/json" };
  const usersRaw = await fetchJson(`${JELLYFIN_URL}/Users`, headers);
  const users = Array.isArray(usersRaw) ? usersRaw as Array<{ Id: string; Policy?: { IsAdministrator?: boolean } }> : [];
  const userId = users.find((user) => user.Policy?.IsAdministrator)?.Id || users[0]?.Id;
  if (!userId) return [];

  const params = new URLSearchParams({
    Filters: "IsResumable",
    SortBy: "DatePlayed",
    SortOrder: "Descending",
    Limit: "12",
    IncludeItemTypes: "Movie,Episode",
    Fields: "UserData",
    EnableImages: "true",
  });
  const raw = await fetchJson(`${JELLYFIN_URL}/Users/${encodeURIComponent(userId)}/Items?${params}`, headers);
  const items = (raw as { Items?: JellyfinItem[] } | null)?.Items || [];

  return items.flatMap((item) => {
    const positionMs = (item.UserData?.PlaybackPositionTicks || 0) / 10_000;
    const durationMs = (item.RunTimeTicks || 0) / 10_000;
    const thumbId = item.Type === "Episode" && item.SeriesId ? item.SeriesId : item.Id;
    const result = toResumeItem({
      id: `jellyfin-${item.Id}`,
      source: "jellyfin",
      title: item.SeriesName || item.Name,
      subtitle: item.SeriesName ? item.Name : item.Type === "Movie" ? "Film" : "À reprendre",
      type: item.Type,
      positionMs,
      durationMs,
      imageUrl: item.ImageTags?.Primary || item.SeriesId
        ? `/dash/api/jellyfin/image?id=${encodeURIComponent(thumbId)}`
        : null,
      href: `${JELLYFIN_URL}/web/#!/details?id=${encodeURIComponent(item.Id)}`,
      lastPlayed: item.UserData?.LastPlayedDate ? new Date(item.UserData.LastPlayedDate).getTime() : 0,
    });
    return result ? [result] : [];
  });
}

export async function GET() {
  const [plex, jellyfin] = await Promise.all([getPlexResume(), getJellyfinResume()]);
  const items = [...plex, ...jellyfin]
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
    .slice(0, 8)
    .map(({ lastPlayed: _lastPlayed, ...item }) => item);

  return NextResponse.json({ items });
}
