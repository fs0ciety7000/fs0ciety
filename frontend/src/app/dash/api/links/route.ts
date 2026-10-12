import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Links of the dashboard, read from fs0ciety-hub's launcher (single source of truth: add / edit / remove
 * them in the hub, https://services.fs0ciety.org/admin/launchpad). The hub is behind Cloudflare Access,
 * hence the Access service token on top of the feed's bearer token. 503 → the page keeps its built-in lists.
 */
export async function GET() {
  const url = process.env.HUB_FEED_URL || "https://services.fs0ciety.org/api/feed/launcher";
  const token = process.env.HUB_FEED_TOKEN;
  if (!token) return NextResponse.json({ error: "HUB_FEED_TOKEN missing" }, { status: 503 });

  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json" };
  if (process.env.HUB_CF_ACCESS_CLIENT_ID && process.env.HUB_CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.HUB_CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = process.env.HUB_CF_ACCESS_CLIENT_SECRET;
  }

  try {
    const res = await fetch(url, { headers, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(5000) });
    if (!res.ok) return NextResponse.json({ error: `hub ${res.status}` }, { status: 502 });
    return NextResponse.json(await res.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "hub unreachable" }, { status: 502 });
  }
}
