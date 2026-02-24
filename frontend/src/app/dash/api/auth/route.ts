import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SEERR_URL = process.env.SEERR_URL || "https://requests.cinenode.org";
const SECRET = process.env.DASH_SESSION_SECRET || "fs0ciety-dash-secret-key-change-me";
const COOKIE = "dash_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

async function hmacSign(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function makeSessionToken(userId: number): Promise<string> {
  const payload = `${userId}.${Date.now()}`;
  const sig = await hmacSign(payload);
  return `${payload}.${sig}`;
}

// POST /dash/api/auth — login with Seerr credentials
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const { email, password } = body ?? {};

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  // Validate against Jellyseerr
  const seerrRes = await fetch(`${SEERR_URL}/api/v1/auth/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);

  if (!seerrRes || !seerrRes.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = await seerrRes.json();
  const token = await makeSessionToken(user.id ?? 0);

  const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.displayName } });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

// DELETE /dash/api/auth — logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
