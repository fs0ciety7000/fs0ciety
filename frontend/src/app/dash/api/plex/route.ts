import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PLEX_URL =
  process.env.PLEX_URL ||
  "https://185-203-56-82.c92770c35f2f4a72a1ad6b1e8f07da83.plex.direct:18825";
const PLEX_TOKEN = process.env.PLEX_TOKEN || "r5NL-YGRroXoxyRpN8nk";

function plexHeaders(): HeadersInit {
  return { "X-Plex-Token": PLEX_TOKEN, Accept: "application/json" };
}

async function plexFetch(path: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${PLEX_URL}${path}`, {
      headers: plexHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Separate fetch for counting — sends container size as both header and query param
async function plexFetchCount(sectionPath: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // Use & if path already contains ?, otherwise ?
    const sep = sectionPath.includes("?") ? "&" : "?";
    const url = `${PLEX_URL}${sectionPath}${sep}X-Plex-Container-Start=0&X-Plex-Container-Size=0`;
    const res = await fetch(url, {
      headers: {
        ...plexHeaders(),
        "X-Plex-Container-Start": "0",
        "X-Plex-Container-Size": "0",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

interface PlexMetadata {
  ratingKey: string;
  title: string;
  type: string;
  year?: number;
  thumb?: string;
  grandparentKey?: string;
  grandparentTitle?: string;
  grandparentThumb?: string;
  parentTitle?: string; // e.g. "Season 3"
  viewOffset?: number;
  duration?: number;
  User?: { title: string };
  Player?: { title: string; state?: string };
}

interface PlexDirectory {
  key: string;
  type: string;
  title: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mc(raw: unknown): any {
  return (raw as { MediaContainer?: unknown })?.MediaContainer;
}

export async function GET() {
  if (!PLEX_TOKEN) {
    return NextResponse.json({ error: "PLEX_TOKEN not configured" }, { status: 503 });
  }

  try {
    const [identityRaw, sectionsRaw, sessionsRaw, recentMoviesRaw, recentEpisodesRaw] =
      await Promise.allSettled([
        plexFetch("/identity"),
        plexFetch("/library/sections"),
        plexFetch("/status/sessions"),
        plexFetch("/library/recentlyAdded?type=1"),
        plexFetch("/library/recentlyAdded?type=4"),
      ]);

    // Machine ID for deep links
    const identity = identityRaw.status === "fulfilled" ? identityRaw.value : null;
    const machineId: string = mc(identity)?.machineIdentifier || "";
    const connected = !!machineId;

    // Library sections
    const sections: PlexDirectory[] =
      sectionsRaw.status === "fulfilled" ? mc(sectionsRaw.value)?.Directory || [] : [];
    const movieSections = sections.filter((s) => s.type === "movie");
    const showSections = sections.filter((s) => s.type === "show");

    // Count fetches (one per section) — using HTTP headers for compatibility
    const countRaw = await Promise.allSettled([
      ...movieSections.map((s) => plexFetchCount(`/library/sections/${s.key}/all`)),
      ...showSections.map((s) => plexFetchCount(`/library/sections/${s.key}/all`)),
      ...showSections.map((s) =>
        plexFetchCount(`/library/sections/${s.key}/all?type=4`)
      ),
    ]);

    const getTotal = (idx: number) =>
      countRaw[idx]?.status === "fulfilled" ? mc(countRaw[idx].value)?.totalSize || 0 : 0;

    let totalMovies = 0;
    for (let i = 0; i < movieSections.length; i++) totalMovies += getTotal(i);

    let totalShows = 0;
    for (let i = 0; i < showSections.length; i++) totalShows += getTotal(movieSections.length + i);

    let totalEpisodes = 0;
    for (let i = 0; i < showSections.length; i++)
      totalEpisodes += getTotal(movieSections.length + showSections.length + i);

    // Sessions → now playing
    const sessions: PlexMetadata[] =
      sessionsRaw.status === "fulfilled" ? mc(sessionsRaw.value)?.Metadata || [] : [];

    const nowPlaying = sessions.map((s) => ({
      user: s.User?.title || "Unknown",
      device: s.Player?.title || "",
      title: s.title,
      seriesName: s.grandparentTitle,
      type: s.type,
      progress: Math.round(((s.viewOffset || 0) / Math.max(s.duration || 1, 1)) * 100),
      isPaused: s.Player?.state === "paused",
      imageUrl: s.thumb ? `${PLEX_URL}${s.thumb}?X-Plex-Token=${PLEX_TOKEN}` : null,
    }));

    // Recent movies
    const movieItems: PlexMetadata[] =
      recentMoviesRaw.status === "fulfilled"
        ? mc(recentMoviesRaw.value)?.Metadata || []
        : [];

    const recentMovies = movieItems.filter((item) => item.type === "movie").slice(0, 12).map((item) => ({
      id: item.ratingKey,
      name: item.title,
      year: item.year,
      imageUrl: item.thumb ? `${PLEX_URL}${item.thumb}?X-Plex-Token=${PLEX_TOKEN}` : null,
      href: machineId
        ? `https://app.plex.tv/desktop/#!/server/${machineId}/details?key=/library/metadata/${item.ratingKey}`
        : "#",
    }));

    // Recent episodes → deduplicate by series (grandparentKey)
    const episodeItems: PlexMetadata[] =
      recentEpisodesRaw.status === "fulfilled"
        ? mc(recentEpisodesRaw.value)?.Metadata || []
        : [];

    const recentEpisodes: Array<{
      id: string;
      name: string;
      seriesName?: string;
      seasonLabel?: string;
      imageUrl: string | null;
      href: string;
    }> = [];
    const seenSeries = new Set<string>();
    for (const item of episodeItems.filter((i) => i.type === "episode")) {
      const seriesKey = item.grandparentKey || "";
      if (seriesKey && seenSeries.has(seriesKey)) continue;
      if (seriesKey) seenSeries.add(seriesKey);

      recentEpisodes.push({
        id: item.ratingKey,
        name: item.grandparentTitle || item.title,
        seriesName: item.grandparentTitle,
        seasonLabel: item.parentTitle || undefined,
        imageUrl: item.grandparentThumb
          ? `${PLEX_URL}${item.grandparentThumb}?X-Plex-Token=${PLEX_TOKEN}`
          : item.thumb
          ? `${PLEX_URL}${item.thumb}?X-Plex-Token=${PLEX_TOKEN}`
          : null,
        href: machineId && seriesKey
          ? `https://app.plex.tv/desktop/#!/server/${machineId}/details?key=${seriesKey}`
          : machineId
          ? `https://app.plex.tv/desktop/#!/server/${machineId}/details?key=/library/metadata/${item.ratingKey}`
          : "#",
      });
      if (recentEpisodes.length >= 12) break;
    }

    return NextResponse.json({
      connected,
      libraries:
        connected && (totalMovies > 0 || totalShows > 0 || totalEpisodes > 0)
          ? { movies: totalMovies, shows: totalShows, episodes: totalEpisodes }
          : connected
          ? { movies: 0, shows: 0, episodes: 0 }
          : null,
      nowPlaying,
      recentMovies,
      recentEpisodes,
    });
  } catch {
    return NextResponse.json(
      { connected: false, libraries: null, nowPlaying: [], recentMovies: [], recentEpisodes: [] },
      { status: 500 }
    );
  }
}
