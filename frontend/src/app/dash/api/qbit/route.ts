import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const QBIT_URL = process.env.QBIT_URL || "https://qbittorrent.cinenode.org";
const QBIT_USER = process.env.QBIT_USER || "";
const QBIT_PASS = process.env.QBIT_PASS || "";

// qBittorrent uses cookie-based auth
let cachedSID: string | null = null;
let sidExpiry = 0;

async function login(): Promise<string | null> {
  if (cachedSID && Date.now() < sidExpiry) return cachedSID;

  try {
    const res = await fetch(`${QBIT_URL}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(QBIT_USER)}&password=${encodeURIComponent(QBIT_PASS)}`,
      redirect: "manual",
    });

    const cookies = res.headers.getSetCookie?.() || [];
    for (const cookie of cookies) {
      const match = cookie.match(/SID=([^;]+)/);
      if (match) {
        cachedSID = match[1];
        sidExpiry = Date.now() + 30 * 60 * 1000; // 30 min
        return cachedSID;
      }
    }

    // Some setups return SID in body or different header
    const text = await res.text();
    if (text === "Ok.") {
      // Try to extract from raw headers
      const raw = res.headers.get("set-cookie");
      if (raw) {
        const m = raw.match(/SID=([^;]+)/);
        if (m) {
          cachedSID = m[1];
          sidExpiry = Date.now() + 30 * 60 * 1000;
          return cachedSID;
        }
      }
    }
  } catch { /* ignore */ }

  return null;
}

async function qbitFetch(path: string) {
  const sid = await login();
  const headers: HeadersInit = {};
  if (sid) headers.Cookie = `SID=${sid}`;

  const res = await fetch(`${QBIT_URL}${path}`, { headers });
  if (!res.ok) {
    // SID might have expired, retry once
    cachedSID = null;
    sidExpiry = 0;
    const newSid = await login();
    if (newSid) {
      const retry = await fetch(`${QBIT_URL}${path}`, {
        headers: { Cookie: `SID=${newSid}` },
      });
      if (retry.ok) return retry.json();
    }
    return null;
  }
  return res.json();
}

interface QbitTorrent {
  name: string;
  size: number;
  progress: number;
  dlspeed: number;
  upspeed: number;
  state: string;
  eta: number;
  category: string;
  added_on: number;
  ratio: number;
  total_size: number;
}

interface QbitTransfer {
  dl_info_speed: number;
  up_info_speed: number;
  dl_info_data: number;
  up_info_data: number;
  dl_rate_limit: number;
  up_rate_limit: number;
}

function stateLabel(state: string): string {
  const map: Record<string, string> = {
    downloading: "DL",
    stalledDL: "STALL",
    uploading: "SEED",
    stalledUP: "SEED",
    pausedDL: "PAUSE",
    pausedUP: "PAUSE",
    queuedDL: "QUEUE",
    queuedUP: "QUEUE",
    checkingDL: "CHECK",
    checkingUP: "CHECK",
    forcedDL: "DL",
    forcedUP: "SEED",
    moving: "MOVE",
    error: "ERR",
    missingFiles: "ERR",
    unknown: "?",
  };
  return map[state] || state.slice(0, 5).toUpperCase();
}

function formatBytes(b: number): string {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export async function GET() {
  if (!QBIT_USER) {
    return NextResponse.json({ error: "QBIT_USER not configured" }, { status: 503 });
  }

  try {
    const [torrentsRaw, transferRaw] = await Promise.all([
      qbitFetch("/api/v2/torrents/info?sort=added_on&reverse=true&limit=50"),
      qbitFetch("/api/v2/transfer/info"),
    ]);

    const torrents: QbitTorrent[] = torrentsRaw || [];
    const transfer: QbitTransfer | null = transferRaw || null;

    const downloading = torrents.filter((t) =>
      ["downloading", "forcedDL", "stalledDL"].includes(t.state)
    );
    const seeding = torrents.filter((t) =>
      ["uploading", "forcedUP", "stalledUP"].includes(t.state)
    );
    const paused = torrents.filter((t) =>
      ["pausedDL", "pausedUP"].includes(t.state)
    );

    // Active downloads with details
    const activeDownloads = downloading.map((t) => ({
      name: t.name,
      size: formatBytes(t.total_size),
      progress: Math.round(t.progress * 100),
      dlspeed: formatBytes(t.dlspeed) + "/s",
      eta: t.eta > 0 && t.eta < 8640000 ? t.eta : null,
      state: stateLabel(t.state),
      category: t.category || "",
    }));

    return NextResponse.json({
      counts: {
        total: torrents.length,
        downloading: downloading.length,
        seeding: seeding.length,
        paused: paused.length,
      },
      transfer: transfer
        ? {
            dlSpeed: formatBytes(transfer.dl_info_speed) + "/s",
            ulSpeed: formatBytes(transfer.up_info_speed) + "/s",
            totalDownloaded: formatBytes(transfer.dl_info_data),
            totalUploaded: formatBytes(transfer.up_info_data),
          }
        : null,
      activeDownloads: activeDownloads.slice(0, 10),
    });
  } catch {
    return NextResponse.json(
      { counts: null, transfer: null, activeDownloads: [] },
      { status: 500 }
    );
  }
}
