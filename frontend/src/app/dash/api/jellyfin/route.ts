import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const JELLYFIN_URL = process.env.JELLYFIN_URL || "https://jellyfin.cinenode.org";
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || "";

const headers = () => ({
  "X-Emby-Token": JELLYFIN_API_KEY,
  Accept: "application/json",
});

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
    ParentBackdropItemId?: string;
  };
  PlayState?: {
    PositionTicks?: number;
    IsPaused: boolean;
    IsMuted: boolean;
  };
}

interface JellyfinItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesName?: string;
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
    const [countsRes, sessionsRes, recentRes] = await Promise.allSettled([
      fetch(`${JELLYFIN_URL}/Items/Counts`, { headers: headers() }),
      fetch(`${JELLYFIN_URL}/Sessions`, { headers: headers() }),
      fetch(
        `${JELLYFIN_URL}/Items/Latest?Limit=12&EnableImages=true&ImageTypeLimit=1&EnableTotalRecordCount=false`,
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

    // Recent items
    let recent: Array<{
      id: string;
      name: string;
      type: string;
      seriesName?: string;
      year?: number;
      dateCreated?: string;
      imageUrl: string | null;
    }> = [];
    if (recentRes.status === "fulfilled" && recentRes.value.ok) {
      const items: JellyfinItem[] = await recentRes.value.json();
      recent = items.map((item) => ({
        id: item.Id,
        name: item.Name,
        type: item.Type,
        seriesName: item.SeriesName,
        year: item.ProductionYear,
        dateCreated: item.DateCreated,
        imageUrl: item.ImageTags?.Primary
          ? `${JELLYFIN_URL}/Items/${item.Id}/Images/Primary?maxHeight=150&api_key=${JELLYFIN_API_KEY}`
          : null,
      }));
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
      recent,
    });
  } catch {
    return NextResponse.json({ counts: null, nowPlaying: [], recent: [] }, { status: 500 });
  }
}
