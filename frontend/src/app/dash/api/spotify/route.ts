import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const TOKEN_FILE = join(process.cwd(), ".spotify_refresh_token");

async function getRefreshToken(): Promise<string | null> {
  if (process.env.SPOTIFY_REFRESH_TOKEN) return process.env.SPOTIFY_REFRESH_TOKEN;
  try {
    return (await readFile(TOKEN_FILE, "utf-8")).trim();
  } catch {
    return null;
  }
}

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

export async function GET() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json(
      { error: "Not configured", authUrl: "/dash/api/spotify/auth" },
      { status: 503 }
    );
  }

  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Failed to refresh token", authUrl: "/dash/api/spotify/auth" },
      { status: 503 }
    );
  }

  const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 204 = no content (nothing playing)
  if (res.status === 204) {
    return NextResponse.json({ playing: false });
  }

  if (!res.ok) {
    return NextResponse.json({ playing: false });
  }

  const data = await res.json();
  if (!data?.item) {
    return NextResponse.json({ playing: false });
  }

  return NextResponse.json({
    playing: data.is_playing,
    track: {
      name: data.item.name,
      artists: (data.item.artists as Array<{ name: string }>)
        .map((a) => a.name)
        .join(", "),
      album: data.item.album.name,
      albumArt: (data.item.album.images as Array<{ url: string }>)[0]?.url || null,
      progress: Math.round((data.progress_ms / data.item.duration_ms) * 100),
      progressMs: data.progress_ms,
      durationMs: data.item.duration_ms,
      url: data.item.external_urls.spotify,
    },
  });
}
