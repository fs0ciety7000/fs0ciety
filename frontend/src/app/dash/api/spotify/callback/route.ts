import { type NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d4c3d6b72c8e4196aaa884fb8ec9268b";
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "564d9dd6b37b42229a372771c004176b";
const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ||
  "https://start.fs0ciety.org/dash/api/spotify/callback";
const TOKEN_FILE = join(process.cwd(), ".spotify_refresh_token");

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.json(
      { error: error || "No authorization code received" },
      { status: 400 }
    );
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: "Token exchange failed", detail: body },
      { status: 500 }
    );
  }

  const data = await res.json();
  const refreshToken: string = data.refresh_token;

  if (refreshToken) {
    try {
      await writeFile(TOKEN_FILE, refreshToken, "utf-8");
    } catch {
      // File write failed — user should set SPOTIFY_REFRESH_TOKEN env var instead
    }
  }

  // Redirect back to the dash with a success indicator
  return NextResponse.redirect(
    new URL("/dash?spotify=connected", request.nextUrl.origin)
  );
}
