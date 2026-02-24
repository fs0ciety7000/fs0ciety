import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d4c3d6b72c8e4196aaa884fb8ec9268b";
const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ||
  "https://start.fs0ciety.org/dash/api/spotify/callback";

export async function GET() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "user-read-currently-playing user-read-playback-state",
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}
