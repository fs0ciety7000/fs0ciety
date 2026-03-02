import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TS_API_KEY = process.env.TAILSCALE_API_KEY || "";
// Use "-" as tailnet to mean "current user's tailnet" — no config needed
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
  blocksIncomingConnections?: boolean;
  authorized?: boolean;
  keyExpiryDisabled?: boolean;
  updateAvailable?: boolean;
}

export async function GET() {
  if (!TS_API_KEY) {
    return NextResponse.json({ error: "TAILSCALE_API_KEY not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.tailscale.com/api/v2/tailnet/${TS_TAILNET}/devices?fields=all`,
      {
        headers: {
          Authorization: `Bearer ${TS_API_KEY}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Tailscale API error ${res.status}: ${text.slice(0, 100)}` },
        { status: 200 }
      );
    }

    const data = await res.json();
    const devices: TailscaleDevice[] = data.devices ?? [];

    const now = Date.now();
    const result = devices.map((d) => {
      // Determine online status: explicit field or lastSeen within 3 minutes
      const lastSeenMs = d.lastSeen ? new Date(d.lastSeen).getTime() : 0;
      const recentlySeen = now - lastSeenMs < 3 * 60 * 1000;
      const online = d.online ?? recentlySeen;

      // Short hostname: strip tailnet suffix
      const shortName = d.name
        .replace(/\.[^.]+\.[^.]+\.ts\.net\.?$/, "")
        .replace(/\.[^.]+\.ts\.net\.?$/, "")
        || d.hostname;

      // Pick first IPv4 address
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
      // Online first, then alphabetical
      if (a.online !== b.online) return a.online ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ devices: result });
  } catch {
    return NextResponse.json({ devices: [], error: "unavailable" }, { status: 200 });
  }
}
