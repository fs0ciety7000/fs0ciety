import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_TUNNEL_ID = process.env.CLOUDFLARE_TUNNEL_ID || "";
const CF_API_KEY = process.env.CLOUDFLARE_API_KEY || "";

const CF_BASE = "https://api.cloudflare.com/client/v4";

async function cfFetch(path: string) {
  const res = await fetch(`${CF_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${CF_API_KEY}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.success ? json.result : null;
}

export async function GET() {
  if (!CF_ACCOUNT_ID || !CF_TUNNEL_ID || !CF_API_KEY) {
    return NextResponse.json({ error: "Cloudflare not configured" }, { status: 503 });
  }

  try {
    const [tunnel, config, connections] = await Promise.all([
      cfFetch(`/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${CF_TUNNEL_ID}`),
      cfFetch(`/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${CF_TUNNEL_ID}/configurations`),
      cfFetch(`/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${CF_TUNNEL_ID}/connections`),
    ]);

    const tunnelUp = Array.isArray(connections) && connections.length > 0;
    const status = tunnel?.status ?? "unknown";

    // Parse ingress rules from config (skip catch-all)
    const ingress: Array<{ hostname: string; service: string }> =
      (config?.config?.ingress ?? [])
        .filter((r: { hostname?: string }) => r.hostname)
        .map((r: { hostname: string; service: string }) => ({
          hostname: r.hostname,
          service: r.service,
        }));

    return NextResponse.json({
      tunnelUp,
      status,
      name: tunnel?.name ?? CF_TUNNEL_ID,
      connectors: connections?.length ?? 0,
      routes: ingress,
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 200 });
  }
}
