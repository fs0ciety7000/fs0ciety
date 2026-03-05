import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── fs0ciety — Whatbox stats (disk free + total) ─────────────
const WHATBOX_URL = "https://zucchini.whatbox.ca/labs/stats?json=1";
const WHATBOX_USER = process.env.WHATBOX_USER || "";
const WHATBOX_PASS = process.env.WHATBOX_PASS || "";

// ── HBD — qBittorrent (free_space_on_disk) ───────────────────
const HBD_QBIT_URL = (process.env.HBD_QBIT_URL || "https://40.ein.itsby.design/qbittorrent").replace(/\/$/, "");
const HBD_QBIT_USER = process.env.HBD_QBIT_USER || "phantomhex";
const HBD_QBIT_PASS = process.env.HBD_QBIT_PASS || "Enzo2011@master";

// ── HBD — Sonarr (diskspace → total) ─────────────────────────
const HBD_SONARR_URL = (process.env.HBD_SONARR_URL || "https://40.ein.itsby.design/sonarr").replace(/\/$/, "");
const HBD_SONARR_KEY = process.env.HBD_SONARR_KEY || "9c09432cbff04058ba537135b19862ea";

let hbdSID: string | null = null;
let hbdSIDExpiry = 0;

// Basic Auth header for the reverse proxy in front of HBD qBit
function hbdBasicAuth(): string {
  return "Basic " + Buffer.from(`${HBD_QBIT_USER}:${HBD_QBIT_PASS}`).toString("base64");
}

function formatBytes(b: number): string {
  if (b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v); return isFinite(n) ? n : null; }
  return null;
}

async function hbdLogin(): Promise<string | null> {
  if (hbdSID && Date.now() < hbdSIDExpiry) return hbdSID;
  try {
    const res = await fetch(`${HBD_QBIT_URL}/api/v2/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        Authorization: hbdBasicAuth(),
      },
      body: `username=${encodeURIComponent(HBD_QBIT_USER)}&password=${encodeURIComponent(HBD_QBIT_PASS)}`,
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const tryExtract = (s: string) => s.match(/SID=([^;]+)/)?.[1] ?? null;
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const sid = tryExtract(c);
      if (sid) { hbdSID = sid; hbdSIDExpiry = Date.now() + 30 * 60 * 1000; return sid; }
    }
    const raw = res.headers.get("set-cookie");
    if (raw) {
      const sid = tryExtract(raw);
      if (sid) { hbdSID = sid; hbdSIDExpiry = Date.now() + 30 * 60 * 1000; return sid; }
    }
  } catch { /* ignore */ }
  return null;
}

async function getHBDQbitFree(): Promise<number | null> {
  const sid = await hbdLogin();
  if (!sid) return null;
  try {
    const res = await fetch(`${HBD_QBIT_URL}/api/v2/sync/maindata`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Authorization: hbdBasicAuth(),
        Cookie: `SID=${sid}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return toNum(data?.server_state?.free_space_on_disk);
  } catch { return null; }
}

async function getHBDSonarrDisk(): Promise<{ free: number | null; total: number | null }> {
  try {
    const res = await fetch(`${HBD_SONARR_URL}/api/v3/diskspace`, {
      headers: { "X-Api-Key": HBD_SONARR_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { free: null, total: null };
    const data = await res.json() as Array<{ freeSpace: unknown; totalSpace: unknown }>;
    if (!Array.isArray(data) || data.length === 0) return { free: null, total: null };
    const main = data.reduce((max, d) =>
      (toNum(d.totalSpace) ?? 0) > (toNum(max.totalSpace) ?? 0) ? d : max, data[0]);
    return { free: toNum(main.freeSpace), total: toNum(main.totalSpace) };
  } catch { return { free: null, total: null }; }
}

async function getWhatboxDisk(): Promise<{ free: number | null; total: number | null }> {
  if (!WHATBOX_USER) return { free: null, total: null };
  try {
    const auth = "Basic " + Buffer.from(`${WHATBOX_USER}:${WHATBOX_PASS}`).toString("base64");
    const res = await fetch(WHATBOX_URL, {
      headers: { Authorization: auth, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { free: null, total: null };
    const data = await res.json();
    const src = data.disk ?? data.storage ?? data.filesystem ?? {};
    const free = toNum(src.free ?? src.available ?? null);
    const total = toNum(src.total ?? src.size ?? null);
    return { free, total };
  } catch { return { free: null, total: null }; }
}

function usedPercent(free: number | null, total: number | null): number | null {
  return total && free != null ? Math.round(((total - free) / total) * 100) : null;
}

export async function GET() {
  const [whatboxResult, hbdQbitResult, hbdSonarrResult] = await Promise.allSettled([
    getWhatboxDisk(),
    getHBDQbitFree(),
    getHBDSonarrDisk(),
  ]);

  const wb = whatboxResult.status === "fulfilled" ? whatboxResult.value : { free: null, total: null };
  const hbdQbitFree = hbdQbitResult.status === "fulfilled" ? hbdQbitResult.value : null;
  const hbdSonarr = hbdSonarrResult.status === "fulfilled" ? hbdSonarrResult.value : { free: null, total: null };

  // qBit free_space_on_disk is partition-accurate; fall back to Sonarr free if qBit fails
  const hbdFree = hbdQbitFree ?? hbdSonarr.free;
  const hbdTotal = hbdSonarr.total;

  return NextResponse.json({
    servers: [
      {
        name: "fs0ciety",
        free: wb.free != null ? formatBytes(wb.free) : null,
        total: wb.total != null ? formatBytes(wb.total) : null,
        usedPercent: usedPercent(wb.free, wb.total),
      },
      {
        name: "HBD",
        free: hbdFree != null ? formatBytes(hbdFree) : null,
        total: hbdTotal != null ? formatBytes(hbdTotal) : null,
        usedPercent: usedPercent(hbdFree, hbdTotal),
      },
    ],
  });
}
