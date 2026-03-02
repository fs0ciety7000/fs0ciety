import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TS_CLIENT_ID = process.env.TAILSCALE_CLIENT_ID || "";
const TS_CLIENT_SECRET = process.env.TAILSCALE_CLIENT_SECRET || "";
const TS_TAILNET = process.env.TAILSCALE_TAILNET || "-";

interface TailscaleDevice {
  id: string;
  name: string;
  hostname: string;
  os: string;
  addresses: string[];
  lastSeen: string;
  online?: boolean;
  user: string;
  tags?: string[];
  updateAvailable?: boolean;
}

async function getOAuthToken(): Promise<string | null> {
  try {
    const res = await fetch("https://api.tailscale.com/api/v2/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: TS_CLIENT_ID,
        client_secret: TS_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Tailscale OAuth error ${res.status}: ${text}`);
      return null;
    }
    const data = await res.json();
    return data.access_token ?? null;
  } catch (e) {
    console.error("Tailscale OAuth fetch failed:", e);
    return null;
  }
}

export async function GET() {
  if (!TS_CLIENT_ID || !TS_CLIENT_SECRET) {
    return NextResponse.json({ error: "TAILSCALE_CLIENT_ID / TAILSCALE_CLIENT_SECRET not configured" }, { status: 503 });
  }

  try {
    const token = await getOAuthToken();
    if (!token) {
      return NextResponse.json({ error: "Tailscale OAuth failed — check client ID/secret" }, { status: 200 });
    }

    const res = await fetch(
      `https://api.tailscale.com/api/v2/tailnet/${TS_TAILNET}/devices?fields=all`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Tailscale API error ${res.status}: ${text.slice(0, 120)}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const devices: TailscaleDevice[] = data.devices ?? [];

    const now = Date.now();
    const result = devices.map((d) => {
      const lastSeenMs = d.lastSeen ? new Date(d.lastSeen).getTime() : 0;
      const recentlySeen = now - lastSeenMs < 3 * 60 * 1000;
      const online = d.online ?? recentlySeen;

      // Strip tailnet suffix from name
      const shortName = d.name
        .replace(/\.[^.]+\.ts\.net\.?$/, "")
        .replace(/\.[^.]+\.[^.]+\.ts\.net\.?$/, "")
        || d.hostname;

      const ipv4 = d.addresses.find((a) => !a.includes(":")) ?? d.addresses[0] ?? "";

      return {
        id: d.id,
        name: shortName,
        hostname: d.hostname,
        os: d.os,
        ip: ipv4,
        online,
        lastSeen: d.lastSeen,
        user: d.user,
        tags: d.tags ?? [],
        updateAvailable: d.updateAvailable ?? false,
      };
    }).sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ devices: result });
  } catch {
    return NextResponse.json({ devices: [], error: "unavailable" }, { status: 200 });
  }
}
