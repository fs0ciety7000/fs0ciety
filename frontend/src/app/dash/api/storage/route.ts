import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ── CF Access (for fs0ciety services behind Cloudflare) ──────
const CF_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID || "";
const CF_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET || "";
const cfH = (): Record<string, string> =>
  CF_CLIENT_ID ? { "CF-Access-Client-Id": CF_CLIENT_ID, "CF-Access-Client-Secret": CF_CLIENT_SECRET } : {};

// ── fs0ciety — qBittorrent (free_space_on_disk, behind CF) ───
const FS_QBIT_URL = (process.env.QBIT_URL || "https://flow.phantomhex.cc").replace(/\/$/, "");
const FS_QBIT_USER = process.env.QBIT_USER || "";
const FS_QBIT_PASS = process.env.QBIT_PASS || "";

// ── fs0ciety — Whatbox stats (total disk) ────────────────────
const WHATBOX_URL = "https://zucchini.whatbox.ca/labs/stats?json=1";
const WHATBOX_USER = process.env.WHATBOX_USER || "";
const WHATBOX_PASS = process.env.WHATBOX_PASS || "";

// ── fs0ciety — Sonarr (diskspace → total, behind CF) ────────
const FS_SONARR_URL = (process.env.SONARR_URL || "https://sonic.phantomhex.cc").replace(/\/$/, "");
const FS_SONARR_KEY = process.env.SONARR_API_KEY || "";

// ── HBD — qBittorrent (free_space_on_disk, behind Basic Auth) ─
const HBD_QBIT_URL = (process.env.HBD_QBIT_URL || "https://40.ein.itsby.design/qbittorrent").replace(/\/$/, "");
const HBD_QBIT_USER = process.env.HBD_QBIT_USER || "phantomhex";
const HBD_QBIT_PASS = process.env.HBD_QBIT_PASS || "Enzo2011@master";

// ── HBD — Sonarr (diskspace → total) ─────────────────────────
const HBD_SONARR_URL = (process.env.HBD_SONARR_URL || "https://40.ein.itsby.design/sonarr").replace(/\/$/, "");
const HBD_SONARR_KEY = process.env.HBD_SONARR_KEY || "9c09432cbff04058ba537135b19862ea";

// SID caches
let fsSID: string | null = null;
let fsSIDExpiry = 0;
let hbdSID: string | null = null;
let hbdSIDExpiry = 0;

const hbdBasicAuth = (): string =>
  "Basic " + Buffer.from(`${HBD_QBIT_USER}:${HBD_QBIT_PASS}`).toString("base64");

function formatBytes(b: number): string {
  if (b <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v) && v > 0) return v;
  if (typeof v === "string") { const n = Number(v); return isFinite(n) && n > 0 ? n : null; }
  return null;
}

// ── fs0ciety qBit login ───────────────────────────────────────
async function fsLogin(): Promise<string | null> {
  if (fsSID && Date.now() < fsSIDExpiry) return fsSID;
  if (!FS_QBIT_USER) return null;
  try {
    const res = await fetch(`${FS_QBIT_URL}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", ...cfH() },
      body: `username=${encodeURIComponent(FS_QBIT_USER)}&password=${encodeURIComponent(FS_QBIT_PASS)}`,
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const extract = (s: string) => s.match(/SID=([^;]+)/)?.[1] ?? null;
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const sid = extract(c);
      if (sid) { fsSID = sid; fsSIDExpiry = Date.now() + 30 * 60 * 1000; return sid; }
    }
    const raw = res.headers.get("set-cookie");
    if (raw) {
      const sid = extract(raw);
      if (sid) { fsSID = sid; fsSIDExpiry = Date.now() + 30 * 60 * 1000; return sid; }
    }
  } catch { /* ignore */ }
  return null;
}

async function getFsQbitFree(): Promise<number | null> {
  const sid = await fsLogin();
  if (!sid) return null;
  try {
    const res = await fetch(`${FS_QBIT_URL}/api/v2/sync/maindata`, {
      headers: { "User-Agent": "Mozilla/5.0", Cookie: `SID=${sid}`, ...cfH() },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return toNum(data?.server_state?.free_space_on_disk);
  } catch { return null; }
}

// ── Whatbox: try multiple field shapes for total disk ─────────
async function getWhatboxTotal(): Promise<number | null> {
  if (!WHATBOX_USER) return null;
  try {
    const auth = "Basic " + Buffer.from(`${WHATBOX_USER}:${WHATBOX_PASS}`).toString("base64");
    const res = await fetch(WHATBOX_URL, { headers: { Authorization: auth, Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();

    // Try flat disk object
    const src = data.disk ?? data.storage ?? data.filesystem ?? data.quota ?? null;
    if (src && !Array.isArray(src)) {
      const t = toNum(src.total ?? src.size ?? src.capacity ?? src.limit ?? src.quota ?? null);
      if (t) return t;
      // Also try free to infer total from used+free
      const free = toNum(src.free ?? src.available ?? null);
      const used = toNum(src.used ?? null);
      if (free && used) return free + used;
    }

    // Try array of partitions — pick largest total
    if (Array.isArray(src) && src.length > 0) {
      const totals = src.map((d: Record<string, unknown>) => toNum(d.total ?? d.size ?? d.capacity ?? null)).filter((v): v is number => v !== null);
      if (totals.length > 0) return Math.max(...totals);
    }

    // Try top-level array (e.g. data itself is array)
    if (Array.isArray(data)) {
      const totals = data.map((d: Record<string, unknown>) => toNum(d.total ?? d.size ?? d.totalSpace ?? null)).filter((v): v is number => v !== null);
      if (totals.length > 0) return Math.max(...totals);
    }

    return null;
  } catch { return null; }
}


async function getFsSonarrTotal(): Promise<number | null> {
  if (!FS_SONARR_KEY) return null;
  try {
    const res = await fetch(`${FS_SONARR_URL}/api/v3/diskspace`, {
      headers: { "X-Api-Key": FS_SONARR_KEY, "User-Agent": "Mozilla/5.0", ...cfH() },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as Array<{ freeSpace: unknown; totalSpace: unknown }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const main = data.reduce((max, d) => (toNum(d.totalSpace) ?? 0) > (toNum(max.totalSpace) ?? 0) ? d : max, data[0]);
    return toNum(main.totalSpace);
  } catch { return null; }
}

// ── HBD qBit login ────────────────────────────────────────────
async function hbdLogin(): Promise<string | null> {
  if (hbdSID && Date.now() < hbdSIDExpiry) return hbdSID;
  try {
    const res = await fetch(`${HBD_QBIT_URL}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", Authorization: hbdBasicAuth() },
      body: `username=${encodeURIComponent(HBD_QBIT_USER)}&password=${encodeURIComponent(HBD_QBIT_PASS)}`,
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const extract = (s: string) => s.match(/SID=([^;]+)/)?.[1] ?? null;
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const sid = extract(c);
      if (sid) { hbdSID = sid; hbdSIDExpiry = Date.now() + 30 * 60 * 1000; return sid; }
    }
    const raw = res.headers.get("set-cookie");
    if (raw) { const sid = extract(raw); if (sid) { hbdSID = sid; hbdSIDExpiry = Date.now() + 30 * 60 * 1000; return sid; } }
  } catch { /* ignore */ }
  return null;
}

async function getHBDQbitFree(): Promise<number | null> {
  const sid = await hbdLogin();
  if (!sid) return null;
  try {
    const res = await fetch(`${HBD_QBIT_URL}/api/v2/sync/maindata`, {
      headers: { "User-Agent": "Mozilla/5.0", Authorization: hbdBasicAuth(), Cookie: `SID=${sid}` },
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
      headers: { "X-Api-Key": HBD_SONARR_KEY, Authorization: hbdBasicAuth(), Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { free: null, total: null };
    const data = await res.json() as Array<{ freeSpace: unknown; totalSpace: unknown }>;
    if (!Array.isArray(data) || data.length === 0) return { free: null, total: null };
    const main = data.reduce((max, d) => (toNum(d.totalSpace) ?? 0) > (toNum(max.totalSpace) ?? 0) ? d : max, data[0]);
    return { free: toNum(main.freeSpace), total: toNum(main.totalSpace) };
  } catch { return { free: null, total: null }; }
}

function usedPercent(free: number | null, total: number | null): number | null {
  return total && free != null ? Math.round(((total - free) / total) * 100) : null;
}

export async function GET() {
  const [fsFreeResult, fsTotalResult, fsSonarrTotalResult, hbdFreeResult, hbdSonarrResult] = await Promise.allSettled([
    getFsQbitFree(),
    getWhatboxTotal(),
    getFsSonarrTotal(),
    getHBDQbitFree(),
    getHBDSonarrDisk(),
  ]);

  const fsFree = fsFreeResult.status === "fulfilled" ? fsFreeResult.value : null;
  const fsWhatboxTotal = fsTotalResult.status === "fulfilled" ? fsTotalResult.value : null;
  const fsSonarrTotal = fsSonarrTotalResult.status === "fulfilled" ? fsSonarrTotalResult.value : null;
  const fsTotal = fsWhatboxTotal ?? fsSonarrTotal;
  const hbdQbitFree = hbdFreeResult.status === "fulfilled" ? hbdFreeResult.value : null;
  const hbdSonarr = hbdSonarrResult.status === "fulfilled" ? hbdSonarrResult.value : { free: null, total: null };

  const hbdFree = hbdQbitFree ?? hbdSonarr.free;
  const hbdTotal = hbdSonarr.total;

  // Aggregate across all servers
  const allFrees = [fsFree, hbdFree].filter((v): v is number => v !== null);
  const allTotals = [fsTotal, hbdTotal].filter((v): v is number => v !== null);
  const aggFree = allFrees.length > 0 ? allFrees.reduce((a, b) => a + b, 0) : null;
  const aggTotal = allTotals.length > 0 ? allTotals.reduce((a, b) => a + b, 0) : null;

  return NextResponse.json({
    servers: [
      {
        name: "fs0ciety",
        free: fsFree != null ? formatBytes(fsFree) : null,
        total: fsTotal != null ? formatBytes(fsTotal) : null,
        usedPercent: usedPercent(fsFree, fsTotal),
      },
      {
        name: "HBD",
        free: hbdFree != null ? formatBytes(hbdFree) : null,
        total: hbdTotal != null ? formatBytes(hbdTotal) : null,
        usedPercent: usedPercent(hbdFree, hbdTotal),
      },
    ],
    aggregate: {
      free: aggFree != null ? formatBytes(aggFree) : null,
      total: aggTotal != null ? formatBytes(aggTotal) : null,
      usedPercent: usedPercent(aggFree, aggTotal),
    },
  });
}
