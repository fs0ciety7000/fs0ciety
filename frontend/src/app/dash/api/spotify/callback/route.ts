import { type NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d4c3d6b72c8e4196aaa884fb8ec9268b";
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "564d9dd6b37b42229a372771c004176b";
const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI ||
  "https://dash.fs0ciety.org/dash/api/spotify/callback";
const TOKEN_FILE = join(process.cwd(), ".spotify_refresh_token");

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return new NextResponse(
      `<html><body style="font-family:monospace;background:#0D0E11;color:#F87171;padding:2rem">
        <h2>Spotify OAuth Error</h2><p>${error || "No authorization code"}</p>
      </body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
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
    return new NextResponse(
      `<html><body style="font-family:monospace;background:#0D0E11;color:#F87171;padding:2rem">
        <h2>Token Exchange Failed</h2><pre>${body}</pre>
      </body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  const data = await res.json();
  const refreshToken: string = data.refresh_token;

  if (!refreshToken) {
    return new NextResponse(
      `<html><body style="font-family:monospace;background:#0D0E11;color:#F87171;padding:2rem">
        <h2>No refresh token returned</h2>
      </body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  // Try to save to file (works in dev / writable containers)
  let savedToFile = false;
  try {
    await writeFile(TOKEN_FILE, refreshToken, "utf-8");
    savedToFile = true;
  } catch { /* read-only filesystem */ }

  if (savedToFile) {
    // Redirect back to dash
    const appOrigin = new URL(REDIRECT_URI).origin;
    return NextResponse.redirect(`${appOrigin}/dash?spotify=connected`);
  }

  // Can't write to file — show token so user can set env var
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><title>Spotify Connected</title></head>
<body style="font-family:monospace;background:#0D0E11;color:#E8E4DC;padding:2rem;max-width:700px;margin:0 auto">
  <h2 style="color:#1DB954">✓ Spotify authorized!</h2>
  <p style="color:#9A948C">The token could not be saved to disk (read-only container).<br>
  Add this environment variable to your deployment:</p>
  <pre style="background:#141619;border:1px solid #252830;padding:1rem;word-break:break-all;color:#F5A623">SPOTIFY_REFRESH_TOKEN=${refreshToken}</pre>
  <p style="color:#9A948C;font-size:0.85em">Then redeploy and Spotify will work automatically.</p>
  <a href="/dash" style="color:#1DB954">← Back to dashboard</a>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
