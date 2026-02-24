import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JELLYFIN_URL = process.env.JELLYFIN_URL || "https://jellyfin.cinenode.org";
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || "";

const headers = () => ({
  "X-Emby-Token": JELLYFIN_API_KEY,
  Accept: "application/json",
});

interface JellyfinUser {
  Id: string;
  Policy?: { IsAdministrator?: boolean };
}

interface JellyfinCounts {
  MovieCount: number;
  SeriesCount: number;
  EpisodeCount: number;
  ArtistCount: number;
  AlbumCount: number;
  SongCount: number;
}

interface JellyfinSession {
  Id: string;
  UserName: string;
  Client: string;
  DeviceName: string;
  NowPlayingItem?: {
    Id: string;
    Name: string;
    SeriesName?: string;
    Type: string;
    RunTimeTicks?: number;
    ImageTags?: { Primary?: string };
  };
  PlayState?: {
    PositionTicks?: number;
    IsPaused: boolean;
  };
}

interface JellyfinItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesName?: string;
  SeriesId?: string;
  DateCreated?: string;
  ImageTags?: { Primary?: string };
  ProductionYear?: number;
}

export async function GET() {
  if (!JELLYFIN_API_KEY) {
    return NextResponse.json(
      { error: "JELLYFIN_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    // Fetch admin user ID for user-scoped endpoints (/Items/Latest requires UserId)
    let userId = "";
    try {
      const usersRes = await fetch(`${JELLYFIN_URL}/Users`, { headers: headers() });
      if (usersRes.ok) {
        const users: JellyfinUser[] = await usersRes.json();
        userId =
          users.find((u) => u.Policy?.IsAdministrator)?.Id ||
          users[0]?.Id ||
          "";
      }
    } catch { /* ignore */ }

    const latestBase = userId
      ? `${JELLYFIN_URL}/Users/${userId}/Items/Latest`
      : `${JELLYFIN_URL}/Items/Latest`;

    const [countsRes, sessionsRes, recentMoviesRes, recentEpisodesRes] =
      await Promise.allSettled([
        fetch(`${JELLYFIN_URL}/Items/Counts`, { headers: headers() }),
        fetch(`${JELLYFIN_URL}/Sessions`, { headers: headers() }),
        fetch(
          `${latestBase}?IncludeItemTypes=Movie&Limit=12&EnableImages=true&ImageTypeLimit=1`,
          { headers: headers() }
        ),
        fetch(
          `${latestBase}?IncludeItemTypes=Episode&Limit=24&EnableImages=true&ImageTypeLimit=1&Fields=SeriesName,SeriesId`,
          { headers: headers() }
        ),
      ]);

    // Counts
    let counts: JellyfinCounts | null = null;
    if (countsRes.status === "fulfilled" && countsRes.value.ok) {
      counts = await countsRes.value.json();
    }

    // Sessions (only those with NowPlayingItem)
    let nowPlaying: Array<{
      user: string;
      client: string;
      device: string;
      title: string;
      seriesName?: string;
      type: string;
      progress: number;
      isPaused: boolean;
      imageUrl: string | null;
    }> = [];
    if (sessionsRes.status === "fulfilled" && sessionsRes.value.ok) {
      const sessions: JellyfinSession[] = await sessionsRes.value.json();
      nowPlaying = sessions
        .filter((s) => s.NowPlayingItem)
        .map((s) => {
          const item = s.NowPlayingItem!;
          const positionTicks = s.PlayState?.PositionTicks || 0;
          const runtimeTicks = item.RunTimeTicks || 1;
          const progress = Math.round((positionTicks / runtimeTicks) * 100);
          const imageUrl = item.ImageTags?.Primary
            ? `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?maxHeight=200&api_key=${JELLYFIN_API_KEY}`
            : null;
          return {
            user: s.UserName,
            client: s.Client,
            device: s.DeviceName,
            title: item.Name,
            seriesName: item.SeriesName,
            type: item.Type,
            progress,
            isPaused: s.PlayState?.IsPaused ?? false,
            imageUrl,
          };
        });
    }

    // Recent movies
    let recentMovies: Array<{
      id: string;
      name: string;
      year?: number;
      imageUrl: string | null;
    }> = [];
    if (recentMoviesRes.status === "fulfilled" && recentMoviesRes.value.ok) {
      const movies: JellyfinItem[] = await recentMoviesRes.value.json();
      recentMovies = movies.map((item) => ({
        id: item.Id,
        name: item.Name,
        year: item.ProductionYear,
        imageUrl: item.ImageTags?.Primary
          ? `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?maxHeight=300&api_key=${JELLYFIN_API_KEY}`
          : null,
      }));
    }

    // Recent episodes → deduplicated by series, using series poster
    let recentEpisodes: Array<{
      id: string;
      name: string;
      seriesName?: string;
      seriesId?: string;
      imageUrl: string | null;
    }> = [];
    if (
      recentEpisodesRes.status === "fulfilled" &&
      recentEpisodesRes.value.ok
    ) {
      const episodes: JellyfinItem[] = await recentEpisodesRes.value.json();
      const seenSeries = new Set<string>();
      for (const ep of episodes) {
        const key = ep.SeriesId || ep.Id;
        if (ep.SeriesId && seenSeries.has(key)) continue;
        if (ep.SeriesId) seenSeries.add(key);

        recentEpisodes.push({
          id: ep.Id,
          name: ep.Name,
          seriesName: ep.SeriesName,
          seriesId: ep.SeriesId,
          imageUrl: ep.SeriesId
            ? `${JELLYFIN_URL}/Items/${ep.SeriesId}/Images/Primary?maxHeight=300&api_key=${JELLYFIN_API_KEY}`
            : ep.ImageTags?.Primary
            ? `${JELLYFIN_URL}/Items/${ep.Id}/Images/Primary?maxHeight=300&api_key=${JELLYFIN_API_KEY}`
            : null,
        });

        if (recentEpisodes.length >= 12) break;
      }
    }

    return NextResponse.json({
      counts: counts
        ? {
            movies: counts.MovieCount,
            series: counts.SeriesCount,
            episodes: counts.EpisodeCount,
            artists: counts.ArtistCount,
            albums: counts.AlbumCount,
            songs: counts.SongCount,
          }
        : null,
      nowPlaying,
      recentMovies,
      recentEpisodes,
    });
  } catch {
    return NextResponse.json(
      { counts: null, nowPlaying: [], recentMovies: [], recentEpisodes: [] },
      { status: 500 }
    );
  }
}
