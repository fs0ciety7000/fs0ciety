"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Icon CDN ────────────────────────────────────────────────
const ICON = (name: string) =>
  `https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/${name}.svg`;

// ── Link definitions ────────────────────────────────────────

interface AppLink {
  name: string;
  url: string;
  icon: string;
}

const PERSONAL_LINKS: AppLink[] = [
  { name: "Booklore", url: "https://book.fs0ciety.org/dashboard", icon: ICON("booklore") },
  { name: "Convertx", url: "https://convert.fs0ciety.org", icon: ICON("convertx") },
  { name: "Documentation", url: "https://docmost.fs0ciety.org", icon: ICON("docmost") },
  { name: "Sign", url: "https://sign.fs0ciety.org", icon: ICON("docuseal") },
  { name: "IT Tools", url: "https://tools.fs0ciety.org", icon: ICON("it-tools") },
  { name: "Paperless", url: "https://paperless.fs0ciety.org", icon: ICON("paperless-ngx") },
  { name: "Pairdrop", url: "https://drop.fs0ciety.org", icon: ICON("pairdrop") },
  { name: "Backup", url: "https://backup.fs0ciety.org", icon: ICON("duplicati") },
  { name: "SSH", url: "https://ssh.fs0ciety.org", icon: ICON("sshwifty") },
  { name: "Mail Admin", url: "https://mail.fs0ciety.org/", icon: ICON("stalwart") },
  { name: "AdGuard Home", url: "http://100.74.40.4:3000", icon: ICON("adguard-home") },
  { name: "PrivateBin", url: "https://paste.fs0ciety.org/", icon: ICON("privatebin") },
];

const BOOKMARKS: AppLink[] = [
  { name: "Protonmail", url: "https://mail.proton.me", icon: ICON("proton-mail") },
  { name: "Gmail", url: "https://mail.google.com", icon: ICON("gmail") },
  { name: "Google Drive", url: "https://drive.google.com", icon: ICON("google-drive") },
  { name: "Proton Drive", url: "https://drive.proton.me", icon: ICON("proton-drive") },
  { name: "Google Photos", url: "https://photos.google.com", icon: ICON("google-photos") },
  { name: "Reddit", url: "https://reddit.com", icon: ICON("reddit") },
  { name: "X", url: "https://x.com", icon: ICON("x") },
];

const MEDIA_LINKS: AppLink[] = [
  { name: "Zucchini", url: "https://whatbox.ca/manage", icon: ICON("server") },
  { name: "Jellyfin", url: "https://jellyfin.cinenode.org/web/", icon: ICON("jellyfin") },
  { name: "Prowlarr", url: "https://prowlarr.cinenode.org/", icon: ICON("prowlarr") },
  { name: "Radarr", url: "https://radarr.cinenode.org/", icon: ICON("radarr") },
  { name: "Sonarr", url: "https://sonarr.cinenode.org/", icon: ICON("sonarr") },
  { name: "Qbit", url: "https://qbittorrent.cinenode.org/", icon: ICON("qbittorrent") },
  { name: "SAB", url: "https://sabnzbd.cinenode.org/", icon: ICON("sabnzbd") },
  { name: "Seerr", url: "https://requests.cinenode.org/", icon: ICON("jellyseerr") },
];

// ── Types ───────────────────────────────────────────────────

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

interface CalEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  description?: string;
  location?: string;
}

interface JellyfinData {
  counts: {
    movies: number;
    series: number;
    episodes: number;
    artists: number;
    albums: number;
    songs: number;
  } | null;
  nowPlaying: Array<{
    user: string;
    client: string;
    device: string;
    title: string;
    seriesName?: string;
    type: string;
    progress: number;
    isPaused: boolean;
    imageUrl: string | null;
  }>;
  recentMovies: Array<{
    id: string;
    name: string;
    year?: number;
    dateCreated?: string;
    imageUrl: string | null;
  }>;
  recentEpisodes: Array<{
    id: string;
    name: string;
    seriesName?: string;
    seriesId?: string;
    dateCreated?: string;
    imageUrl: string | null;
  }>;
}

interface AdGuardData {
  stats: {
    totalQueries: number;
    blockedFiltering: number;
    avgProcessingTime: number;
    dnsQueries: number[];
    blockedSeries: number[];
    topBlocked: Array<{ domain: string; count: number }>;
  } | null;
  running: boolean;
}

interface SeerrData {
  requests: Array<{
    id: number;
    title: string;
    type: string;
    status: string;
    posterUrl: string | null;
    requestedBy: string;
    createdAt: string;
  }>;
  counts: {
    total: number;
    movie: number;
    tv: number;
    pending: number;
    approved: number;
    available: number;
  } | null;
}

interface QbitData {
  counts: {
    total: number;
    downloading: number;
    seeding: number;
    paused: number;
  } | null;
  transfer: {
    dlSpeed: string;
    ulSpeed: string;
    totalDownloaded: string;
    totalUploaded: string;
  } | null;
  activeDownloads: Array<{
    hash: string;
    name: string;
    size: string;
    progress: number;
    dlspeed: string;
    eta: number | null;
    state: string;
    category: string;
  }>;
  activeSeeds: Array<{
    name: string;
    size: string;
    ratio: number;
    ulspeed: string;
    state: string;
    category: string;
  }>;
}

interface RadarrData {
  stats: {
    total: number;
    monitored: number;
    withFile: number;
    missing: number;
  } | null;
  diskspace: Array<{
    path: string;
    label: string;
    freeSpace: string;
    totalSpace: string;
    usedPercent: number;
  }>;
}

interface SonarrData {
  stats: {
    total: number;
    monitored: number;
    episodes: number;
    downloaded: number;
    missing: number;
  } | null;
}

interface PlexData {
  connected: boolean;
  libraries: { movies: number; shows: number; episodes: number } | null;
  nowPlaying: Array<{
    user: string;
    device: string;
    title: string;
    seriesName?: string;
    type: string;
    progress: number;
    isPaused: boolean;
    imageUrl: string | null;
  }>;
  recentMovies: Array<{
    id: string;
    name: string;
    year?: number;
    imageUrl: string | null;
    href: string;
  }>;
  recentEpisodes: Array<{
    id: string;
    name: string;
    seriesName?: string;
    seasonLabel?: string;
    imageUrl: string | null;
    href: string;
  }>;
}

interface SABData {
  connected?: boolean;
  speed: string;
  speedBps: number;
  queue: {
    count: number;
    active: Array<{
      nzo_id: string;
      name: string;
      size: string;
      progress: number;
      speed: string;
      timeLeft: string;
      status: string;
    }>;
  };
  history: {
    recent: Array<{
      name: string;
      size: string;
      status: string;
      completedAt: string;
    }>;
    totalCompleted: number;
  };
  stats: {
    monthDownloaded: string;
    totalDownloaded: string;
  };
}

interface SpotifyData {
  playing: boolean;
  track?: {
    name: string;
    artists: string;
    album: string;
    albumArt: string | null;
    progress: number;
    progressMs: number;
    durationMs: number;
    url: string;
  };
  error?: string;
  authUrl?: string;
}

interface MetricsData {
  upload: number | null;
  download: number | null;
  diskUsed: number | null;
  diskFree: number | null;
  diskTotal: number | null;
  uploadFormatted: string | null;
  downloadFormatted: string | null;
  diskUsedFormatted: string | null;
  diskFreeFormatted: string | null;
  diskTotalFormatted: string | null;
  usedPercent: number | null;
  error?: string;
}

interface NowPlayingItem {
  source: "jellyfin" | "plex";
  user: string;
  device: string;
  title: string;
  seriesName?: string;
  type: string;
  progress: number;
  isPaused: boolean;
  imageUrl: string | null;
  thumbUrl: string | null;
}

interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windKph: number;
    label: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    precipChance: number;
    label: string;
    icon: string;
  }>;
}

interface ProwlarrData {
  indexers: Array<{
    id: number;
    name: string;
    queries: number;
    grabs: number;
    rss: number;
    failedQueries: number;
    failRate: number;
    avgMs: number;
  }>;
  totals: {
    queries: number;
    grabs: number;
    failed: number;
    indexerCount: number;
  };
}

interface SeerrSearchResult {
  id: number;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string | null;
  mediaStatus: number; // 0=none, 2=pending, 3=processing, 4=partial, 5=available
}

interface SeerrDetailSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
}

// ── Theme ───────────────────────────────────────────────────

type DashTheme = "terminal" | "industrial";
const DASH_THEME_KEY = "fs0ciety_dash_theme";

function useDashTheme(): [DashTheme, (t: DashTheme) => void] {
  const [theme, setThemeState] = useState<DashTheme>("terminal");

  useEffect(() => {
    const saved = localStorage.getItem(DASH_THEME_KEY) as DashTheme | null;
    if (saved === "industrial") setThemeState("industrial");
  }, []);

  const setTheme = (t: DashTheme) => {
    setThemeState(t);
    localStorage.setItem(DASH_THEME_KEY, t);
  };

  return [theme, setTheme];
}

// ── Media mode ──────────────────────────────────────────────

type MediaMode = "jellyfin" | "plex" | "both";
const MEDIA_MODE_KEY = "fs0ciety_media_mode";

function useMediaMode(): [MediaMode, (m: MediaMode) => void] {
  const [mode, setModeState] = useState<MediaMode>("jellyfin");

  useEffect(() => {
    const saved = localStorage.getItem(MEDIA_MODE_KEY) as MediaMode | null;
    if (saved === "plex" || saved === "both") setModeState(saved);
  }, []);

  const setMode = (m: MediaMode) => {
    setModeState(m);
    localStorage.setItem(MEDIA_MODE_KEY, m);
  };

  return [mode, setMode];
}

// ── Colors ──────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  Korben: "text-terminal-amber",
  "The Verge": "text-terminal-cyan",
  Wired: "text-terminal-purple",
  TechCrunch: "text-terminal-green",
  fs0ciety: "text-terminal-red",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-terminal-amber",
  approved: "text-terminal-cyan",
  available: "text-terminal-green",
  declined: "text-terminal-red",
  processing: "text-terminal-purple",
};

// ── Helpers ─────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function formatEventTime(dtstart: string): string {
  const d = new Date(dtstart);
  if (isNaN(d.getTime())) return "";
  if (!dtstart.includes("T")) return "All day";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatETA(seconds: number | null): string {
  if (!seconds || seconds <= 0 || seconds > 8640000) return "--";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${m > 0 ? `${m}m` : ""}`;
}

// ── Theme-aware classes ─────────────────────────────────────

function cx(theme: DashTheme) {
  const ind = theme === "industrial";
  return {
    // ── neo-industrial dark: deep steel + orange/amber accents ──
    page: ind
      ? "min-h-screen bg-[#0D0E11] p-4 md:p-6 lg:p-8 font-mono dash-industrial"
      : "min-h-screen bg-terminal-black p-4 md:p-6 lg:p-8 font-mono",
    card: ind
      ? "relative bg-[#141619] border border-[#252830] p-4 overflow-hidden"
      : "border border-terminal-green/20 bg-terminal-black-light p-4",
    cardHover: ind
      ? "bg-[#141619] border border-[#252830] hover:border-[#F5622A]/30 transition-all"
      : "border border-terminal-gray-light bg-terminal-black-light hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all",
    title: ind ? "text-[#E8E4DC]" : "text-terminal-green",
    titleDim: ind ? "text-[#9A948C]" : "text-terminal-green-dim",
    textMain: ind ? "text-[#E8E4DC]" : "text-terminal-green",
    textDim: ind ? "text-[#9A948C]" : "text-terminal-green-dim",
    textMuted: ind ? "text-[#5A5550]" : "text-terminal-green-dim/50",
    textMuted2: ind ? "text-[#383530]" : "text-terminal-green-dim/30",
    accent: ind ? "text-[#F5622A]" : "text-terminal-amber",
    link: ind ? "text-[#22D3EE]" : "text-terminal-cyan",
    green: ind ? "text-[#34D399]" : "text-terminal-green",
    red: ind ? "text-[#F87171]" : "text-terminal-red",
    amber: ind ? "text-[#F5A623]" : "text-terminal-amber",
    cyan: ind ? "text-[#22D3EE]" : "text-terminal-cyan",
    purple: ind ? "text-[#A78BFA]" : "text-terminal-purple",
    border: ind ? "border-[#252830]" : "border-terminal-gray-light",
    borderAccent: ind ? "border-[#F5622A]/30" : "border-terminal-green/20",
    bg: ind ? "bg-[#0D0E11]" : "bg-terminal-black",
    bgCard: ind ? "bg-[#141619]" : "bg-terminal-black",
    bgAlt: ind ? "bg-[#1C1D22]" : "bg-terminal-black-light",
    statBox: ind
      ? "bg-[#1C1D22] border border-[#252830] p-3"
      : "border border-terminal-gray-light bg-terminal-black p-3",
    linkCard: ind
      ? "group flex items-center gap-3 px-3 py-2 bg-[#141619] border border-[#252830] hover:border-[#F5622A]/40 hover:bg-[#1C1D22] transition-all"
      : "group flex items-center gap-3 px-3 py-2.5 border border-terminal-gray-light bg-terminal-black-light hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all",
    linkIcon: ind
      ? "opacity-50 group-hover:opacity-90 transition-opacity shrink-0"
      : "opacity-60 group-hover:opacity-100 transition-opacity shrink-0",
    linkText: ind
      ? "text-xs font-mono text-[#9A948C] group-hover:text-[#E8E4DC] transition-colors truncate"
      : "text-xs font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors truncate",
    linkArrow: ind
      ? "ml-auto text-[#383530] text-[10px] group-hover:text-[#F5622A] transition-colors shrink-0"
      : "ml-auto text-terminal-green-dim/30 text-[10px] group-hover:text-terminal-green/50 transition-colors shrink-0",
    sectionIcon: ind ? "text-[#F5622A] text-xs" : "text-terminal-amber text-xs",
    sectionTitle: ind
      ? "text-xs font-mono text-[#9A948C] uppercase tracking-widest font-bold"
      : "text-xs font-mono text-terminal-green uppercase tracking-wider font-bold",
    sectionBorder: ind ? "border-b border-[#252830]" : "border-b border-terminal-gray-light",
    progressBg: ind ? "bg-[#1C1D22]" : "bg-terminal-green/10",
    progressFill: ind ? "bg-[#F5622A]" : "bg-terminal-green/60",
    progressFillAlt: ind ? "bg-[#22D3EE]" : "bg-terminal-cyan/60",
    chartColor1: ind ? "#F5622A" : "#00D4FF",
    chartColor2: ind ? "#F87171" : "#FF0033",
    liveTag: ind ? "text-[10px] font-mono text-[#F5622A] animate-pulse" : "text-[10px] font-mono text-terminal-green animate-pulse",
    headerLink: ind
      ? "text-xs text-[#9A948C] hover:text-[#F5622A] transition-colors border border-[#252830] px-3 py-1"
      : "text-xs text-terminal-green-dim hover:text-terminal-green transition-colors border border-terminal-green/20 px-3 py-1",
    headerLinkActive: ind
      ? "text-xs text-[#22D3EE] hover:text-[#F5622A] transition-colors border border-[#22D3EE]/20 px-3 py-1"
      : "text-xs text-terminal-cyan hover:text-terminal-green transition-colors border border-terminal-cyan/20 px-3 py-1",
    mediaIcon: ind
      ? "group flex flex-col items-center gap-1.5 py-2 px-1 bg-[#141619] border border-[#252830] hover:border-[#F5622A]/40 hover:bg-[#1C1D22] transition-all"
      : "group flex flex-col items-center gap-1.5 py-2 px-1 border border-terminal-gray-light bg-terminal-black hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all",
    mediaIconLabel: ind
      ? "text-[9px] font-mono text-[#5A5550] group-hover:text-[#9A948C] transition-colors"
      : "text-[9px] font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors",
    imgThumb: ind
      ? "w-10 h-14 object-cover shrink-0 border border-[#252830]"
      : "w-10 h-14 object-cover shrink-0 border border-terminal-green/20",
  };
}

// ── Service Status Hook ──────────────────────────────────────

function useServiceStatus(urls: string[]) {
  const [status, setStatus] = useState<Record<string, boolean | undefined>>({});

  useEffect(() => {
    if (!urls.length) return;
    const check = () => {
      const encoded = urls.join(",");
      fetch(`/dash/api/status?urls=${encodeURIComponent(encoded)}`)
        .then((r) => r.json())
        .then((results: Array<{ url: string; up: boolean }>) => {
          const map: Record<string, boolean> = {};
          for (const r of results) map[r.url] = r.up;
          setStatus(map);
        })
        .catch(() => {});
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}

// ── Shared Components ───────────────────────────────────────

function StatusLed({ up, theme }: { up?: boolean; theme: DashTheme }) {
  const ind = theme === "industrial";
  if (up === undefined) {
    return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ind ? "bg-[#383530]" : "bg-terminal-green-dim/20"}`} />;
  }
  if (up) {
    return (
      <span className="relative shrink-0 flex w-1.5 h-1.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${ind ? "bg-[#34D399]" : "bg-terminal-green"}`} />
        <span className={`relative inline-flex rounded-full w-1.5 h-1.5 ${ind ? "bg-[#34D399]" : "bg-terminal-green"}`} />
      </span>
    );
  }
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ind ? "bg-[#F87171]" : "bg-terminal-red"}`} />;
}

function CornerBrackets({ color = "#F5622A", size = 8 }: { color?: string; size?: number }) {
  const b: React.CSSProperties = { position: "absolute", borderColor: color, borderStyle: "solid", width: size, height: size };
  return (
    <>
      <span style={{ ...b, top: 0, left: 0, borderWidth: "1.5px 0 0 1.5px" }} />
      <span style={{ ...b, top: 0, right: 0, borderWidth: "1.5px 1.5px 0 0" }} />
      <span style={{ ...b, bottom: 0, left: 0, borderWidth: "0 0 1.5px 1.5px" }} />
      <span style={{ ...b, bottom: 0, right: 0, borderWidth: "0 1.5px 1.5px 0" }} />
    </>
  );
}

function LinkCard({ link, theme, up }: { link: AppLink; theme: DashTheme; up?: boolean }) {
  const c = cx(theme);
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={c.linkCard}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={link.icon} alt="" width={18} height={18}
        className={c.linkIcon}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className={c.linkText}>{link.name}</span>
      <StatusLed up={up} theme={theme} />
    </a>
  );
}

function SectionHeader({ title, icon, extra, theme }: { title: string; icon: string; extra?: React.ReactNode; theme: DashTheme }) {
  const c = cx(theme);
  const ind = theme === "industrial";
  return (
    <div className={`flex items-center gap-2 mb-3 pb-2 ${c.sectionBorder}`}>
      {!ind && <span className={c.sectionIcon}>{icon}</span>}
      <h2 className={ind
        ? "font-display text-sm font-bold uppercase tracking-[0.22em] text-[#E8E4DC] shrink-0"
        : c.sectionTitle}>{title}</h2>
      {ind && <div className="flex-1 h-px bg-[#252830] ml-2" />}
      {extra && <div className="shrink-0 ml-2">{extra}</div>}
    </div>
  );
}

function StatBox({ label, value, sub, color, theme }: { label: string; value: string; sub?: string; color?: string; theme: DashTheme }) {
  const c = cx(theme);
  const defaultColor = theme === "industrial" ? "text-[#E8E4DC]" : "text-terminal-green";
  return (
    <div className={c.statBox}>
      <div className={`text-[10px] font-mono ${c.textMuted} uppercase tracking-wider mb-1`}>{label}</div>
      <div className={`text-lg font-bold font-mono tabular-nums ${color || defaultColor}`}>{value}</div>
      {sub && <div className={`text-[10px] font-mono ${c.textMuted2} mt-0.5`}>{sub}</div>}
    </div>
  );
}

function HudStat({ label, value, unit, color, theme }: { label: string; value: string; unit?: string; color?: string; theme: DashTheme }) {
  const c = cx(theme);
  if (theme !== "industrial") return <StatBox label={label} value={value} color={color} theme={theme} />;
  return (
    <div className="relative bg-[#0D0E11] border border-[#252830] p-3 overflow-hidden">
      <CornerBrackets color="#F5622A" size={6} />
      <div className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-widest mb-1`}>{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`font-display text-2xl font-black tabular-nums leading-none ${color || "text-[#E8E4DC]"}`}>{value}</span>
        {unit && <span className={`text-[9px] font-mono ${c.textMuted} uppercase ml-0.5`}>{unit}</span>}
      </div>
    </div>
  );
}

// ── Mini chart ──────────────────────────────────────────────

function MiniChart({ data, color = "#00FF41", height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const width = 100;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${i * step},${height - (v / max) * height}`).join(" ");
  const area = `0,${height} ${points} ${(data.length - 1) * step},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <polygon points={area} fill={color} opacity="0.1" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// ── RSS Feed ────────────────────────────────────────────────

function RSSFeed({ theme }: { theme: DashTheme }) {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);

  useEffect(() => {
    fetch("/dash/api/rss")
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sourceColor = (src: string) => {
    if (theme === "industrial") {
      const map: Record<string, string> = {
        Korben: "text-[#F5A623]", "The Verge": "text-[#22D3EE]", Wired: "text-[#A78BFA]",
        TechCrunch: "text-[#34D399]", fs0ciety: "text-[#F87171]",
      };
      return map[src] || "text-[#9A948C]";
    }
    return SOURCE_COLORS[src] || "text-terminal-green-dim";
  };

  return (
    <div className={c.card}>
      <SectionHeader title="RSS Feeds" icon="$" theme={theme} />
      {loading ? (
        <div className={`text-xs font-mono ${c.textDim} animate-pulse py-4`}>Fetching feeds...</div>
      ) : items.length === 0 ? (
        <div className={`text-xs font-mono ${c.textMuted} py-4`}>No feed items available.</div>
      ) : (
        <div className="space-y-0.5 max-h-[calc(100vh-260px)] overflow-y-auto">
          {items.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
              className={`group flex items-start gap-2 py-1.5 px-1 ${theme === "industrial" ? "hover:bg-[#1C1D22]" : "hover:bg-terminal-green/5"} transition-colors`}>
              <span className={`text-[10px] font-mono shrink-0 w-16 uppercase font-bold ${sourceColor(item.source)}`}>
                {item.source}
              </span>
              <span className={`text-xs font-mono ${c.textDim} group-hover:${c.textMain} transition-colors flex-1 min-w-0 line-clamp-2`}>
                {item.title}
              </span>
              {item.pubDate && (
                <span className={`text-[10px] font-mono ${c.textMuted2} shrink-0 tabular-nums`}>{timeAgo(item.pubDate)}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calendar ────────────────────────────────────────────────

function Calendar({ theme }: { theme: DashTheme }) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());
  const c = cx(theme);

  useEffect(() => {
    fetch("/dash/api/calendar")
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    for (const ev of events) {
      const d = new Date(ev.dtstart);
      dates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return dates;
  }, [events]);

  const dayEvents = useMemo(
    () => events.filter((ev) => isSameDay(new Date(ev.dtstart), selectedDate)),
    [events, selectedDate]
  );

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewMonth]);

  const prevMonth = useCallback(() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1)), []);
  const nextMonth = useCallback(() => setViewMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1)), []);
  const today = new Date();
  const monthLabel = viewMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const dayBtnCls = (isSelected: boolean, isToday: boolean) => {
    if (theme === "industrial") {
      if (isSelected) return "bg-[#F5622A] text-[#E8E4DC] font-bold";
      if (isToday) return "text-[#F5622A] font-bold border border-[#F5622A]/40";
      return "text-[#9A948C] hover:bg-[#1C1D22]";
    }
    if (isSelected) return "bg-terminal-green text-terminal-black font-bold";
    if (isToday) return "text-terminal-green font-bold border border-terminal-green/40";
    return "text-terminal-green-dim hover:bg-terminal-green/10";
  };

  const dotColor = theme === "industrial" ? "bg-[#F5622A]" : "bg-terminal-amber";

  return (
    <div className={c.card}>
      <SectionHeader title="Calendar" icon="#" theme={theme} />
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className={`text-xs font-mono ${c.textDim} hover:${c.textMain} px-2 py-1 transition-colors`}>&laquo;</button>
        <span className={`text-xs font-mono ${c.textMain} capitalize`}>{monthLabel}</span>
        <button onClick={nextMonth} className={`text-xs font-mono ${c.textDim} hover:${c.textMain} px-2 py-1 transition-colors`}>&raquo;</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((d) => (
          <div key={d} className={`text-center text-[10px] font-mono ${c.textMuted} py-1`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-4">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="h-7" />;
          const dateObj = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
          const isToday = isSameDay(dateObj, today);
          const isSelected = isSameDay(dateObj, selectedDate);
          const hasEvent = eventDates.has(`${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`);
          return (
            <button key={`d-${day}`} onClick={() => setSelectedDate(dateObj)}
              className={`h-7 text-[11px] font-mono transition-colors relative ${dayBtnCls(isSelected, isToday)}`}>
              {day}
              {hasEvent && !isSelected && <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${dotColor}`} />}
            </button>
          );
        })}
      </div>
      <div className={`border-t ${c.border} pt-3`}>
        <div className={`text-[10px] font-mono ${c.textMuted} uppercase tracking-wider mb-2`}>
          {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {loading ? (
          <div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div>
        ) : dayEvents.length === 0 ? (
          <div className={`text-xs font-mono ${c.textMuted2} py-2`}>No events</div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((ev, i) => (
              <div key={i} className={`flex items-start gap-2 py-1.5 px-2 border-l-2 ${theme === "industrial" ? "border-[#F5622A] bg-[#F5622A]/5" : "border-terminal-amber bg-terminal-amber/5"}`}>
                <span className={`text-[10px] font-mono ${c.accent} shrink-0 tabular-nums mt-0.5`}>{formatEventTime(ev.dtstart)}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono ${c.textMain} truncate`}>{ev.summary}</div>
                  {ev.location && <div className={`text-[10px] font-mono ${c.textMuted} truncate`}>{ev.location}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Jellyfin Section ────────────────────────────────────────

function JellyfinSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<JellyfinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const c = cx(theme);
  const ind = theme === "industrial";

  useEffect(() => {
    fetch("/dash/api/jellyfin")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    const interval = setInterval(() => {
      fetch("/dash/api/jellyfin").then((r) => r.json()).then(setData).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className={c.card}><SectionHeader title="Jellyfin" icon=">" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data) return (
    <div className={c.card}>
      <SectionHeader title="Jellyfin" icon=">" theme={theme} />
      <div className={`text-xs font-mono ${c.textMuted} py-2`}>Unable to connect to Jellyfin — check JELLYFIN_API_KEY.</div>
    </div>
  );

  const divider = `border-t ${ind ? "border-[#252830]" : "border-terminal-gray-light"} pt-3 mt-3`;
  const hasRecent = data.recentMovies.length > 0 || data.recentEpisodes.length > 0;

  const posterCard = (id: string, href: string, imageUrl: string | null, title: string, sub?: string) => (
    <a key={id} href={href} target="_blank" rel="noopener noreferrer"
      className={`group overflow-hidden ${ind ? "bg-[#141619] border border-[#252830] hover:border-[#F5622A]/40" : "border border-terminal-gray-light bg-terminal-black hover:border-terminal-green/40"} transition-all`}>
      <div className="w-full aspect-[2/3] overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className={`w-full h-full ${c.bgAlt} flex items-center justify-center ${c.textMuted2} text-[9px] font-mono`}>?</div>
        )}
      </div>
      <div className="p-1">
        <div className={`text-[9px] font-mono ${c.textDim} truncate leading-tight`}>{title}</div>
        {sub && <div className={`text-[8px] font-mono ${c.textMuted2} truncate mt-0.5`}>{sub}</div>}
      </div>
    </a>
  );

  return (
    <div className={c.card}>
      {ind && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Jellyfin" icon=">" theme={theme}
        extra={hasRecent ? (
          <button onClick={() => setExpanded(!expanded)}
            className={`text-[9px] font-mono px-2 py-0.5 border transition-all ${ind ? "border-[#252830] text-[#5A5550] hover:text-[#9A948C] hover:border-[#F5622A]/30" : "border-terminal-gray-light text-terminal-green-dim/40 hover:text-terminal-green-dim"}`}>
            {expanded ? "▲" : "▼"}
          </button>
        ) : undefined} />

      {/* Library stats */}
      {data.counts && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <HudStat label="Movies" value={formatNumber(data.counts.movies)} color={c.amber} theme={theme} />
          <HudStat label="Series" value={formatNumber(data.counts.series)} color={c.cyan} theme={theme} />
          <HudStat label="Episodes" value={formatNumber(data.counts.episodes)} color={c.green} theme={theme} />
          <HudStat label="Artists" value={formatNumber(data.counts.artists)} color={c.purple} theme={theme} />
          <HudStat label="Albums" value={formatNumber(data.counts.albums)} color={c.amber} theme={theme} />
          <HudStat label="Songs" value={formatNumber(data.counts.songs)} color={c.cyan} theme={theme} />
        </div>
      )}

      {/* Recent Films — collapsible */}
      {expanded && data.recentMovies.length > 0 && (
        <div className={divider}>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-widest mb-2`}>Recent Films</div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
            {data.recentMovies.map((item) =>
              posterCard(item.id, `https://jellyfin.cinenode.org/web/#!/details?id=${item.id}`, item.imageUrl, item.name, item.year?.toString())
            )}
          </div>
        </div>
      )}

      {/* Recent Shows — collapsible */}
      {expanded && data.recentEpisodes.length > 0 && (
        <div className={divider}>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-widest mb-2`}>Recent Shows</div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
            {data.recentEpisodes.map((item) =>
              posterCard(
                item.seriesId || item.id,
                `https://jellyfin.cinenode.org/web/#!/details?id=${item.seriesId || item.id}`,
                item.imageUrl,
                item.seriesName || item.name,
                item.name !== item.seriesName ? item.name : undefined
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plex Section ─────────────────────────────────────────────

function PlexSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<PlexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const c = cx(theme);
  const ind = theme === "industrial";

  useEffect(() => {
    fetch("/dash/api/plex")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    const interval = setInterval(() => {
      fetch("/dash/api/plex").then((r) => r.json()).then(setData).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className={c.card}><SectionHeader title="Plex" icon=">" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data || !data.connected) return (
    <div className={c.card}>
      <SectionHeader title="Plex" icon=">" theme={theme} />
      <div className={`text-xs font-mono ${c.textMuted} py-2`}>Unable to connect to Plex — check PLEX_TOKEN.</div>
    </div>
  );

  const divider = `border-t ${ind ? "border-[#252830]" : "border-terminal-gray-light"} pt-3 mt-3`;
  const hasRecent = data.recentMovies.length > 0 || data.recentEpisodes.length > 0;

  const posterCard = (id: string, href: string, imageUrl: string | null, title: string, sub?: string) => (
    <a key={id} href={href} target="_blank" rel="noopener noreferrer"
      className={`group overflow-hidden ${ind ? "bg-[#141619] border border-[#252830] hover:border-[#F5622A]/40" : "border border-terminal-gray-light bg-terminal-black hover:border-terminal-green/40"} transition-all`}>
      <div className="w-full aspect-[2/3] overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className={`w-full h-full ${c.bgAlt} flex items-center justify-center ${c.textMuted2} text-[9px] font-mono`}>?</div>
        )}
      </div>
      <div className="p-1">
        <div className={`text-[9px] font-mono ${c.textDim} truncate leading-tight`}>{title}</div>
        {sub && <div className={`text-[8px] font-mono ${c.textMuted2} truncate mt-0.5`}>{sub}</div>}
      </div>
    </a>
  );

  return (
    <div className={c.card}>
      {ind && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Plex" icon=">" theme={theme}
        extra={hasRecent ? (
          <button onClick={() => setExpanded(!expanded)}
            className={`text-[9px] font-mono px-2 py-0.5 border transition-all ${ind ? "border-[#252830] text-[#5A5550] hover:text-[#9A948C] hover:border-[#F5622A]/30" : "border-terminal-gray-light text-terminal-green-dim/40 hover:text-terminal-green-dim"}`}>
            {expanded ? "▲" : "▼"}
          </button>
        ) : undefined} />

      {/* Library stats */}
      {data.libraries && (
        <div className="grid grid-cols-3 gap-2">
          <HudStat label="Movies" value={formatNumber(data.libraries.movies)} color={c.amber} theme={theme} />
          <HudStat label="Shows" value={formatNumber(data.libraries.shows)} color={c.cyan} theme={theme} />
          <HudStat label="Episodes" value={formatNumber(data.libraries.episodes)} color={c.green} theme={theme} />
        </div>
      )}

      {/* Recent Films — collapsible */}
      {expanded && data.recentMovies.length > 0 && (
        <div className={divider}>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-widest mb-2`}>Recent Films</div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
            {data.recentMovies.map((item) =>
              posterCard(item.id, item.href, item.imageUrl, item.name, item.year?.toString())
            )}
          </div>
        </div>
      )}

      {/* Recent Shows — collapsible */}
      {expanded && data.recentEpisodes.length > 0 && (
        <div className={divider}>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-widest mb-2`}>Recent Shows</div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
            {data.recentEpisodes.map((item) =>
              posterCard(item.id, item.href, item.imageUrl, item.name, item.seasonLabel)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AdGuard Section ─────────────────────────────────────────

function AdGuardSection({ theme, compact = false }: { theme: DashTheme; compact?: boolean }) {
  const [data, setData] = useState<AdGuardData | null>(null);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);

  useEffect(() => {
    fetch("/dash/api/adguard")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={c.card}><SectionHeader title="AdGuard Home" icon="!" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data?.stats) return null;

  const { stats, running } = data;
  const blockRate = stats.totalQueries > 0 ? ((stats.blockedFiltering / stats.totalQueries) * 100).toFixed(1) : "0";

  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="AdGuard Home" icon="!" theme={theme}
        extra={<span className={`text-[10px] font-mono ${running ? c.green : c.red}`}>{running ? "● RUNNING" : "● DOWN"}</span>} />
      <div className="grid grid-cols-3 gap-2 mb-3">
        <StatBox label="Queries" value={formatNumber(stats.totalQueries)} color={c.cyan} theme={theme} />
        <StatBox label="Blocked" value={formatNumber(stats.blockedFiltering)} sub={`${blockRate}%`} color={c.red} theme={theme} />
        <StatBox label="Latency" value={`${(stats.avgProcessingTime * 1000).toFixed(1)}ms`} color={c.amber} theme={theme} />
      </div>
      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-1`}>DNS Queries (24h)</div>
              <MiniChart data={stats.dnsQueries} color={c.chartColor1} height={44} />
            </div>
            <div>
              <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-1`}>Blocked (24h)</div>
              <MiniChart data={stats.blockedSeries} color={c.chartColor2} height={44} />
            </div>
          </div>
          {stats.topBlocked.length > 0 && (
            <div>
              <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-1`}>Top Blocked</div>
              <div className="space-y-0.5">
                {stats.topBlocked.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] font-mono gap-2">
                    <span className={`${c.red} truncate flex-1`}>{d.domain}</span>
                    <span className={`${c.textMuted2} tabular-nums shrink-0`}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Media Request Section ────────────────────────────────────

function MediaRequestSection({ theme }: { theme: DashTheme }) {
  const c = cx(theme);
  const ind = theme === "industrial";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv">("all");
  const [results, setResults] = useState<SeerrSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SeerrSearchResult | null>(null);
  const [seasons, setSeasons] = useState<SeerrDetailSeason[]>([]);
  const [requestedSeasons, setRequestedSeasons] = useState<number[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [detailStatus, setDetailStatus] = useState(0);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [is4k, setIs4k] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [trending, setTrending] = useState<SeerrSearchResult[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  // Load trending once on first open
  useEffect(() => {
    if (!open || trending.length > 0) return;
    setLoadingTrending(true);
    fetch("/dash/api/seerr/trending")
      .then((r) => r.json())
      .then((d) => setTrending(d.results || []))
      .catch(() => {})
      .finally(() => setLoadingTrending(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || !open) { setResults([]); return; }
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/dash/api/seerr/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          const all: SeerrSearchResult[] = d.results || [];
          setResults(typeFilter === "all" ? all : all.filter((r) => r.mediaType === typeFilter));
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [query, typeFilter, open]);

  // Load TV seasons on select
  useEffect(() => {
    if (!selected) { setSeasons([]); setSelectedSeasons([]); setRequestedSeasons([]); setDetailStatus(0); return; }
    if (selected.mediaType === "movie") {
      setDetailStatus(selected.mediaStatus);
      setSeasons([]);
      setSelectedSeasons([]);
      return;
    }
    setLoadingDetail(true);
    fetch(`/dash/api/seerr/detail?id=${selected.tmdbId}&type=tv`)
      .then((r) => r.json())
      .then((d) => {
        const fetchedSeasons: SeerrDetailSeason[] = d.seasons || [];
        const reqSet = new Set<number>(d.requestedSeasons || []);
        setSeasons(fetchedSeasons);
        setDetailStatus(d.mediaStatus ?? selected.mediaStatus);
        setRequestedSeasons(d.requestedSeasons || []);
        // Pre-select unrequested seasons
        const unrequested = fetchedSeasons.filter((s) => !reqSet.has(s.seasonNumber)).map((s) => s.seasonNumber);
        setSelectedSeasons(unrequested.length > 0 ? unrequested : fetchedSeasons.map((s) => s.seasonNumber));
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.tmdbId]);

  const toggleSeason = (num: number) => {
    setSelectedSeasons((prev) => prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]);
  };

  const submit = async () => {
    if (!selected) return;
    if (selected.mediaType === "tv" && selectedSeasons.length === 0) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/dash/api/seerr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: selected.mediaType,
          mediaId: selected.tmdbId,
          seasons: selected.mediaType === "tv" ? selectedSeasons : undefined,
          is4k,
        }),
      });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setSubmitResult({ ok: true, msg: "✓ Requête envoyée !" });
        setTimeout(() => {
          setSelected(null); setSubmitResult(null); setQuery(""); setResults([]);
        }, 2500);
      } else {
        setSubmitResult({ ok: false, msg: data.error || "Erreur" });
      }
    } catch {
      setSubmitResult({ ok: false, msg: "Erreur réseau" });
    } finally {
      setSubmitting(false);
    }
  };

  const mediaStatusBadge = (status: number) => {
    if (status === 5) return { label: "Disponible", cls: ind ? "text-[#34D399]" : "text-terminal-green" };
    if (status === 4) return { label: "Partiel", cls: ind ? "text-[#A78BFA]" : "text-terminal-purple" };
    if (status === 3) return { label: "En cours", cls: ind ? "text-[#22D3EE]" : "text-terminal-cyan" };
    if (status === 2) return { label: "En attente", cls: ind ? "text-[#F5A623]" : "text-terminal-amber" };
    return null;
  };

  const posterUrl = (path: string | null, size = "w342") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

  const canSubmit = !submitting && !!selected && (
    selected.mediaType === "movie" || selectedSeasons.length > 0
  );

  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}

      {/* Collapsible header */}
      <button
        onClick={() => { setOpen((o) => !o); if (open) { setSelected(null); setQuery(""); setResults([]); setSubmitResult(null); } }}
        className="w-full text-left"
      >
        <SectionHeader
          title="Request Media"
          icon="+"
          theme={theme}
          extra={
            <span className={`text-[10px] font-mono transition-colors ${open ? c.accent : c.textMuted}`}>
              {open ? "▼ fermer" : "▶ ouvrir"}
            </span>
          }
        />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {/* Search bar + type filter */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 shrink-0">
              {(["all", "movie", "tv"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t); setSelected(null); }}
                  className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                    typeFilter === t
                      ? ind ? "border-[#F5622A] text-[#F5622A] bg-[#F5622A]/10" : "border-terminal-green text-terminal-green bg-terminal-green/10"
                      : ind ? "border-[#252830] text-[#9A948C] hover:text-[#E8E4DC]" : "border-terminal-gray-light text-terminal-green-dim hover:text-terminal-green"
                  }`}
                >
                  {t === "all" ? "Tout" : t === "movie" ? "🎬 Film" : "📺 Série"}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); setSubmitResult(null); }}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="Rechercher un film ou une série…"
              className={`flex-1 text-xs font-mono px-3 py-1.5 border bg-transparent outline-none transition-colors ${
                ind
                  ? "border-[#252830] text-[#E8E4DC] placeholder-[#5A5550] focus:border-[#F5622A]/60"
                  : "border-terminal-gray-light text-terminal-green placeholder-terminal-green-dim/40 focus:border-terminal-green/60"
              }`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {searching && (
              <span className={`text-[10px] font-mono ${c.textMuted} animate-pulse shrink-0`}>…</span>
            )}
          </div>

          {/* Results grid */}
          {results.length > 0 && (
            <div className="grid grid-cols-10 gap-1.5">
              {results.map((result) => {
                const badge = mediaStatusBadge(result.mediaStatus);
                const isSelected = selected?.id === result.id;
                const url = posterUrl(result.posterPath);
                return (
                  <button
                    key={result.id}
                    onClick={() => setSelected(isSelected ? null : result)}
                    className={`relative group text-left transition-all ${
                      isSelected
                        ? ind ? "ring-1 ring-[#F5622A]" : "ring-1 ring-terminal-green"
                        : ind ? "hover:ring-1 ring-[#F5622A]/40" : "hover:ring-1 ring-terminal-green/40"
                    }`}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url} alt=""
                        className="w-full aspect-[2/3] object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className={`w-full aspect-[2/3] flex items-center justify-center text-base ${ind ? "bg-[#1C1D22]" : "bg-terminal-black"}`}>
                        {result.mediaType === "movie" ? "🎬" : "📺"}
                      </div>
                    )}
                    {badge && (
                      <span className={`absolute top-0.5 right-0.5 text-[8px] font-mono font-bold px-1 leading-tight ${
                        ind ? "bg-[#0D0E11]/85" : "bg-terminal-black/85"
                      } ${badge.cls}`}>
                        {badge.label === "Disponible" ? "✓" : "●"}
                      </span>
                    )}
                    <div className={`text-[9px] font-mono truncate mt-0.5 px-0.5 ${c.textDim}`}>
                      {result.title}
                    </div>
                    {result.year && (
                      <div className={`text-[8px] font-mono px-0.5 ${c.textMuted}`}>{result.year}</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Trending grid when query is empty */}
          {results.length === 0 && !query.trim() && (
            <div>
              <div className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-wider mb-2`}>
                Tendances
              </div>
              {loadingTrending ? (
                <div className={`text-[10px] font-mono ${c.textMuted} animate-pulse`}>Chargement…</div>
              ) : trending.length > 0 ? (
                <div className="grid grid-cols-10 gap-1.5">
                  {(typeFilter === "all" ? trending : trending.filter((r) => r.mediaType === typeFilter)).map((result) => {
                    const badge = mediaStatusBadge(result.mediaStatus);
                    const isSelected = selected?.id === result.id;
                    const url = posterUrl(result.posterPath);
                    return (
                      <button
                        key={result.id}
                        onClick={() => setSelected(isSelected ? null : result)}
                        className={`relative group text-left transition-all ${
                          isSelected
                            ? ind ? "ring-1 ring-[#F5622A]" : "ring-1 ring-terminal-green"
                            : ind ? "hover:ring-1 ring-[#F5622A]/40" : "hover:ring-1 ring-terminal-green/40"
                        }`}
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="w-full aspect-[2/3] object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className={`w-full aspect-[2/3] flex items-center justify-center text-base ${ind ? "bg-[#1C1D22]" : "bg-terminal-black"}`}>
                            {result.mediaType === "movie" ? "🎬" : "📺"}
                          </div>
                        )}
                        {badge && (
                          <span className={`absolute top-0.5 right-0.5 text-[8px] font-mono font-bold px-1 leading-tight ${
                            ind ? "bg-[#0D0E11]/85" : "bg-terminal-black/85"
                          } ${badge.cls}`}>
                            {badge.label === "Disponible" ? "✓" : "●"}
                          </span>
                        )}
                        <div className={`text-[9px] font-mono truncate mt-0.5 px-0.5 ${c.textDim}`}>{result.title}</div>
                        {result.year && <div className={`text-[8px] font-mono px-0.5 ${c.textMuted}`}>{result.year}</div>}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}

          {results.length === 0 && query.trim() && !searching && (
            <div className={`text-[10px] font-mono ${c.textMuted} py-1 text-center`}>
              Aucun résultat pour &laquo;{query}&raquo;
            </div>
          )}

          {/* Detail / request panel */}
          {selected && (
            <div className={`border-t pt-3 space-y-3 ${c.border}`}>
              <div className="flex gap-3">
                {/* Poster */}
                {posterUrl(selected.posterPath, "w92") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={posterUrl(selected.posterPath, "w92")!}
                    alt=""
                    className={`w-14 shrink-0 object-cover border ${ind ? "border-[#252830]" : "border-terminal-gray-light"}`}
                  />
                ) : (
                  <div className={`w-14 shrink-0 flex items-center justify-center text-2xl ${ind ? "bg-[#1C1D22]" : "bg-terminal-black"}`}>
                    {selected.mediaType === "movie" ? "🎬" : "📺"}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-mono font-bold leading-tight ${c.textMain} truncate`}>
                    {selected.title}
                  </div>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5 mb-1.5">
                    {selected.year && (
                      <span className={`text-[10px] font-mono ${c.textMuted}`}>{selected.year}</span>
                    )}
                    <span className={`text-[10px] font-mono ${c.textMuted}`}>
                      {selected.mediaType === "movie" ? "Film" : "Série TV"}
                    </span>
                    {(() => {
                      const b = mediaStatusBadge(detailStatus);
                      return b ? (
                        <span className={`text-[10px] font-mono font-bold ${b.cls}`}>{b.label}</span>
                      ) : null;
                    })()}
                  </div>
                  {selected.overview && (
                    <p className={`text-[10px] font-mono ${c.textDim} leading-relaxed line-clamp-2`}>
                      {selected.overview}
                    </p>
                  )}
                </div>
              </div>

              {/* TV Seasons */}
              {selected.mediaType === "tv" && (
                <div>
                  {loadingDetail ? (
                    <div className={`text-[10px] font-mono ${c.textMuted} animate-pulse`}>
                      Chargement des saisons…
                    </div>
                  ) : seasons.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-mono uppercase tracking-wider ${c.textMuted}`}>
                          Saisons — {selectedSeasons.length}/{seasons.length} sélectionnées
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedSeasons(seasons.filter((s) => !requestedSeasons.includes(s.seasonNumber)).map((s) => s.seasonNumber))}
                            className={`text-[9px] font-mono ${c.link} hover:underline`}
                          >
                            Tout
                          </button>
                          <button
                            onClick={() => setSelectedSeasons([])}
                            className={`text-[9px] font-mono ${c.textMuted} hover:underline`}
                          >
                            Aucun
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {seasons.map((s) => {
                          const isReq = requestedSeasons.includes(s.seasonNumber);
                          const isSel = selectedSeasons.includes(s.seasonNumber);
                          return (
                            <button
                              key={s.seasonNumber}
                              onClick={() => !isReq && toggleSeason(s.seasonNumber)}
                              title={isReq ? "Déjà disponible / demandé" : `${s.name} — ${s.episodeCount} épisodes`}
                              className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                                isReq
                                  ? ind ? "border-[#34D399]/25 text-[#34D399] cursor-default opacity-60" : "border-terminal-green/25 text-terminal-green cursor-default opacity-60"
                                  : isSel
                                  ? ind ? "border-[#F5622A] text-[#F5622A] bg-[#F5622A]/10" : "border-terminal-green text-terminal-green bg-terminal-green/10"
                                  : ind ? "border-[#252830] text-[#9A948C] hover:border-[#383B47]" : "border-terminal-gray-light text-terminal-green-dim hover:border-terminal-green/40"
                              }`}
                            >
                              {isReq ? "✓" : isSel ? "●" : "○"} S{s.seasonNumber}
                              {s.episodeCount > 0 && (
                                <span className={`ml-1 text-[8px] opacity-70`}>{s.episodeCount}ep</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Options + Submit */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <label className={`flex items-center gap-2 cursor-pointer select-none ${c.textDim}`}>
                  <input
                    type="checkbox"
                    checked={is4k}
                    onChange={(e) => setIs4k(e.target.checked)}
                    className="w-3 h-3"
                  />
                  <span className="text-[10px] font-mono">4K</span>
                </label>

                <div className="flex items-center gap-2">
                  {submitResult && (
                    <span className={`text-[10px] font-mono font-bold ${submitResult.ok ? c.green : c.red}`}>
                      {submitResult.msg}
                    </span>
                  )}
                  <button
                    onClick={() => { setSelected(null); setSubmitResult(null); }}
                    className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                      ind ? "border-[#252830] text-[#9A948C] hover:text-[#E8E4DC]" : "border-terminal-gray-light text-terminal-green-dim hover:text-terminal-green"
                    }`}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={submit}
                    disabled={!canSubmit}
                    className={`text-[10px] font-mono px-3 py-1 border font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      ind
                        ? "border-[#F5622A] text-[#F5622A] hover:bg-[#F5622A]/10 active:bg-[#F5622A]/20"
                        : "border-terminal-green text-terminal-green hover:bg-terminal-green/10 active:bg-terminal-green/20"
                    }`}
                  >
                    {submitting ? "…" : "REQUEST →"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Metrics Section (Whatbox) ────────────────────────────────

function MetricsSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<MetricsData | null>(null);
  const c = cx(theme);
  const ind = theme === "industrial";

  useEffect(() => {
    fetch("/dash/api/metrics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
    const interval = setInterval(() => {
      fetch("/dash/api/metrics").then((r) => r.json()).then(setData).catch(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!data || data.error) return null;

  const warn = data.usedPercent !== null && data.usedPercent > 85;

  return (
    <div className={c.card}>
      {ind && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Zucchini" icon="⬡" theme={theme}
        extra={<a href="https://whatbox.ca/manage" target="_blank" rel="noopener noreferrer" className={c.headerLink}>open →</a>} />
      <div className="grid grid-cols-2 gap-2 mb-3">
        {data.uploadFormatted && (
          <HudStat label="Uploadé" value={data.uploadFormatted} color={c.amber} theme={theme} />
        )}
        {data.downloadFormatted && (
          <HudStat label="Téléchargé" value={data.downloadFormatted} color={c.cyan} theme={theme} />
        )}
        {data.diskFreeFormatted && (
          <HudStat label="Disque libre" value={data.diskFreeFormatted} color={warn ? c.red : c.green} theme={theme} />
        )}
        {data.diskTotalFormatted && (
          <HudStat label="Total" value={data.diskTotalFormatted} theme={theme} />
        )}
      </div>
      {data.usedPercent !== null && (
        <>
          <div className={`w-full h-2 ${c.progressBg} rounded-full`}>
            <div
              className={`h-full rounded-full transition-all ${warn ? (ind ? "bg-[#F87171]" : "bg-terminal-red/60") : c.progressFillAlt}`}
              style={{ width: `${data.usedPercent}%` }}
            />
          </div>
          <div className={`text-[9px] font-mono ${warn ? c.red : c.textMuted2} mt-1 text-right tabular-nums`}>
            {data.usedPercent}% utilisé{data.diskUsedFormatted ? ` — ${data.diskUsedFormatted}` : ""}
          </div>
        </>
      )}
    </div>
  );
}

// ── Seerr Section ───────────────────────────────────────────

function SeerrSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<SeerrData | null>(null);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);

  useEffect(() => {
    fetch("/dash/api/seerr")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (status: string) => {
    if (theme === "industrial") {
      const map: Record<string, string> = {
        pending: "text-[#F5A623]", approved: "text-[#22D3EE]", available: "text-[#34D399]",
        declined: "text-[#F87171]", processing: "text-[#A78BFA]",
      };
      return map[status] || "text-[#9A948C]";
    }
    return STATUS_COLORS[status] || "text-terminal-green-dim";
  };

  if (loading) return <div className={c.card}><SectionHeader title="Seerr" icon="?" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data) return (
    <div className={c.card}>
      <SectionHeader title="Seerr Requests" icon="?" theme={theme} />
      <div className={`text-xs font-mono ${c.textMuted} py-2`}>Unable to connect to Seerr — check SEERR_API_KEY.</div>
    </div>
  );

  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Seerr Requests" icon="?" theme={theme} />
      {data.counts && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <HudStat label="Available" value={`${data.counts.available}/${data.counts.total}`} color={c.green} theme={theme} />
          <HudStat label="Pending" value={data.counts.pending.toString()} color={c.amber} theme={theme} />
          <HudStat label="Approved" value={data.counts.approved.toString()} color={c.cyan} theme={theme} />
        </div>
      )}
      {data.requests.length > 0 && (
        <div className="space-y-2">
          {data.requests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 py-1.5">
              {req.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={req.posterUrl} alt="" className={`w-10 h-14 object-cover shrink-0 ${theme === "industrial" ? "border border-[#252830]" : "border border-terminal-gray-light"}`}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className={`w-10 h-14 shrink-0 flex items-center justify-center ${theme === "industrial" ? "bg-[#1C1D22] border border-[#252830]" : "bg-terminal-black border border-terminal-gray-light"}`}>
                  <span className={`text-[9px] font-mono ${c.textMuted}`}>{req.type === "movie" ? "🎬" : "📺"}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-mono ${c.textDim} truncate`}>{req.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-mono font-bold uppercase ${statusColor(req.status)}`}>{req.status}</span>
                  <span className={`text-[10px] font-mono ${c.textMuted2}`}>{req.requestedBy}</span>
                </div>
              </div>
              <span className={`text-[10px] font-mono ${c.textMuted2} shrink-0 tabular-nums`}>{timeAgo(req.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── qBittorrent Section ─────────────────────────────────────

function QBitSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<QbitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const c = cx(theme);
  const ind = theme === "industrial";

  const load = useCallback(() =>
    fetch("/dash/api/qbit")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {}),
  []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const qbitAction = useCallback(async (action: string, hash: string) => {
    setPending((p) => ({ ...p, [hash]: true }));
    try {
      await fetch("/dash/api/qbit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hash }),
      });
      setTimeout(load, 600);
    } finally {
      setPending((p) => ({ ...p, [hash]: false }));
    }
  }, [load]);

  if (loading) return <div className={c.card}><SectionHeader title="qBittorrent" icon="↓" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data) return null;

  const hasActive = data.activeDownloads.length > 0;

  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="qBittorrent" icon="↓" theme={theme}
        extra={hasActive ? <span className={c.liveTag}>LIVE</span> : undefined} />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {data.counts && (
          <>
            <HudStat label="Downloading" value={data.counts.downloading.toString()} color={c.cyan} theme={theme} />
            <HudStat label="Seeding" value={data.counts.seeding.toString()} color={c.green} theme={theme} />
          </>
        )}
      </div>

      {/* Transfer stats */}
      {data.transfer && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <HudStat label="DL Speed" value={data.transfer.dlSpeed} color={c.cyan} theme={theme} />
          <HudStat label="UL Speed" value={data.transfer.ulSpeed} color={c.amber} theme={theme} />
        </div>
      )}

      {/* Active downloads */}
      {hasActive && (
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-2`}>Active Downloads</div>
          <div className="space-y-2">
            {data.activeDownloads.map((dl, i) => (
              <div key={i} className={`p-2 ${ind ? "bg-[#1C1D22] border border-[#252830]" : "bg-terminal-black border border-terminal-gray-light"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-mono ${c.textMain} truncate flex-1 mr-2`}>{dl.name}</span>
                  <span className={`text-[10px] font-mono ${c.cyan} tabular-nums shrink-0`}>{dl.progress}%</span>
                </div>
                <div className={`w-full h-1 ${c.progressBg} rounded-full`}>
                  <div className={`h-full ${c.progressFillAlt} rounded-full transition-all`} style={{ width: `${dl.progress}%` }} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[10px] font-mono ${c.cyan} tabular-nums`}>{dl.dlspeed}</span>
                  <span className={`text-[10px] font-mono ${c.textMuted2}`}>{dl.size}</span>
                  <span className={`text-[10px] font-mono ${c.textMuted2} tabular-nums`}>ETA {formatETA(dl.eta)}</span>
                  {dl.category && <span className={`text-[10px] font-mono ${c.accent}`}>{dl.category}</span>}
                  <div className="ml-auto flex items-center gap-1 shrink-0">
                    {dl.state === "PAUSE" ? (
                      <button disabled={!!pending[dl.hash]} onClick={() => qbitAction("resume", dl.hash)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 border transition-colors ${ind ? "border-[#34D399]/40 text-[#34D399] hover:bg-[#34D399]/10" : "border-terminal-green/40 text-terminal-green hover:bg-terminal-green/10"} disabled:opacity-40`}>
                        ▶
                      </button>
                    ) : (
                      <button disabled={!!pending[dl.hash]} onClick={() => qbitAction("pause", dl.hash)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 border transition-colors ${ind ? "border-[#F5A623]/40 text-[#F5A623] hover:bg-[#F5A623]/10" : "border-terminal-amber/40 text-terminal-amber hover:bg-terminal-amber/10"} disabled:opacity-40`}>
                        ‖
                      </button>
                    )}
                    <button disabled={!!pending[dl.hash]} onClick={() => qbitAction("delete", dl.hash)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 border transition-colors ${ind ? "border-[#F87171]/40 text-[#F87171] hover:bg-[#F87171]/10" : "border-terminal-red/40 text-terminal-red hover:bg-terminal-red/10"} disabled:opacity-40`}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seeding list */}
      {(data.activeSeeds || []).length > 0 && (
        <div className={hasActive ? "mt-3" : ""}>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-2 flex items-center gap-2`}>
            <span>Seeding</span>
            <span className={`${c.green} tabular-nums`}>{data.counts?.seeding}</span>
            <span className={c.textMuted2}>total — top 5 shown</span>
          </div>
          <div className="space-y-1.5">
            {(data.activeSeeds || []).map((s, i) => (
              <div key={i} className={`p-2 ${theme === "industrial" ? "bg-[#1C1D22] border border-[#252830]" : "bg-terminal-black border border-terminal-gray-light"}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[11px] font-mono ${c.textDim} truncate flex-1 mr-2`}>{s.name}</span>
                  <span className={`text-[10px] font-mono ${c.green} tabular-nums shrink-0`}>✓ {s.ratio.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono ${c.amber} tabular-nums`}>↑ {s.ulspeed}</span>
                  <span className={`text-[10px] font-mono ${c.textMuted2}`}>{s.size}</span>
                  {s.category && <span className={`text-[10px] font-mono ${c.accent}`}>{s.category}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SABnzbd Section ─────────────────────────────────────────

function SABSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<SABData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const c = cx(theme);
  const ind = theme === "industrial";

  const load = useCallback(() =>
    fetch("/dash/api/sabnzbd")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {}),
  []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const sabAction = useCallback(async (action: string, nzo_id: string) => {
    setPending((p) => ({ ...p, [nzo_id]: true }));
    try {
      await fetch("/dash/api/sabnzbd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nzo_id }),
      });
      setTimeout(load, 600);
    } finally {
      setPending((p) => ({ ...p, [nzo_id]: false }));
    }
  }, [load]);

  if (loading) return <div className={c.card}><SectionHeader title="SABnzbd" icon="↧" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data) return null;

  if (data.connected === false) {
    return (
      <div className={c.card}>
        <SectionHeader title="SABnzbd" icon="↧" theme={theme}
          extra={<span className={`text-[10px] font-mono ${c.red}`}>● UNREACHABLE</span>} />
        <div className={`text-xs font-mono ${c.textMuted} py-2`}>
          Cannot reach SABnzbd — check SAB_URL / SAB_API_KEY or network access.
        </div>
      </div>
    );
  }

  const hasActive = data.queue.active.length > 0;

  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="SABnzbd" icon="↧" theme={theme}
        extra={hasActive ? <span className={c.liveTag}>LIVE</span> : undefined} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <HudStat label="Speed" value={data.speed} color={c.cyan} theme={theme} />
        <HudStat label="Queue" value={data.queue.count.toString()} color={c.amber} theme={theme} />
        <HudStat label="This Month" value={data.stats.monthDownloaded} color={c.accent} theme={theme} />
        <HudStat label="All Time" value={data.stats.totalDownloaded} theme={theme} />
      </div>

      {/* Active downloads */}
      {hasActive && (
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-2`}>Active Downloads</div>
          <div className="space-y-2">
            {data.queue.active.slice(0, 5).map((dl, i) => (
              <div key={i} className={`p-2 ${ind ? "bg-[#1C1D22] border border-[#252830]" : "bg-terminal-black border border-terminal-gray-light"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-mono ${c.textMain} truncate flex-1 mr-2`}>{dl.name}</span>
                  <span className={`text-[10px] font-mono ${c.cyan} tabular-nums shrink-0`}>{dl.progress}%</span>
                </div>
                <div className={`w-full h-1 ${c.progressBg} rounded-full`}>
                  <div className={`h-full ${c.progressFillAlt} rounded-full transition-all`} style={{ width: `${dl.progress}%` }} />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[10px] font-mono ${c.cyan} tabular-nums`}>{dl.speed}</span>
                  <span className={`text-[10px] font-mono ${c.textMuted2}`}>{dl.size}</span>
                  {dl.timeLeft && <span className={`text-[10px] font-mono ${c.textMuted2} tabular-nums`}>ETA {dl.timeLeft}</span>}
                  <span className={`text-[10px] font-mono ${dl.status === "Downloading" ? c.green : c.textDim}`}>{dl.status}</span>
                  {dl.nzo_id && (
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      {dl.status === "Paused" ? (
                        <button disabled={!!pending[dl.nzo_id]} onClick={() => sabAction("resume", dl.nzo_id)}
                          className={`text-[9px] font-mono px-1.5 py-0.5 border transition-colors ${ind ? "border-[#34D399]/40 text-[#34D399] hover:bg-[#34D399]/10" : "border-terminal-green/40 text-terminal-green hover:bg-terminal-green/10"} disabled:opacity-40`}>
                          ▶
                        </button>
                      ) : (
                        <button disabled={!!pending[dl.nzo_id]} onClick={() => sabAction("pause", dl.nzo_id)}
                          className={`text-[9px] font-mono px-1.5 py-0.5 border transition-colors ${ind ? "border-[#F5A623]/40 text-[#F5A623] hover:bg-[#F5A623]/10" : "border-terminal-amber/40 text-terminal-amber hover:bg-terminal-amber/10"} disabled:opacity-40`}>
                          ‖
                        </button>
                      )}
                      <button disabled={!!pending[dl.nzo_id]} onClick={() => sabAction("delete", dl.nzo_id)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 border transition-colors ${ind ? "border-[#F87171]/40 text-[#F87171] hover:bg-[#F87171]/10" : "border-terminal-red/40 text-terminal-red hover:bg-terminal-red/10"} disabled:opacity-40`}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent history */}
      {data.history.recent.length > 0 && !hasActive && (
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-2`}>Recent ({data.history.totalCompleted} total)</div>
          <div className="space-y-1">
            {data.history.recent.map((h, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className={`text-[10px] font-mono font-bold ${h.status === "Completed" ? c.green : c.red}`}>
                  {h.status === "Completed" ? "✓" : "✗"}
                </span>
                <span className={`text-[11px] font-mono ${c.textDim} truncate flex-1`}>{h.name}</span>
                <span className={`text-[10px] font-mono ${c.textMuted2} shrink-0`}>{h.size}</span>
                {h.completedAt && <span className={`text-[10px] font-mono ${c.textMuted2} tabular-nums shrink-0`}>{timeAgo(h.completedAt)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Radarr Section ───────────────────────────────────────────

function RadarrSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<RadarrData | null>(null);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);

  useEffect(() => {
    fetch("/dash/api/radarr")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={c.card}><SectionHeader title="Radarr" icon="▶" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data?.stats) return null;

  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Radarr" icon="▶" theme={theme}
        extra={<a href="https://radarr.cinenode.org" target="_blank" rel="noopener noreferrer" className={c.headerLink}>open →</a>} />
      <div className="grid grid-cols-2 gap-2">
        <HudStat label="Total Films" value={data.stats.total.toString()} color={c.amber} theme={theme} />
        <HudStat label="Monitored" value={data.stats.monitored.toString()} color={c.cyan} theme={theme} />
        <HudStat label="Downloaded" value={data.stats.withFile.toString()} color={c.green} theme={theme} />
        <HudStat label="Missing" value={data.stats.missing.toString()} color={data.stats.missing > 0 ? c.red : c.textMuted} theme={theme} />
      </div>
    </div>
  );
}

// ── Sonarr Section ───────────────────────────────────────────

function SonarrSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<SonarrData | null>(null);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);

  useEffect(() => {
    fetch("/dash/api/sonarr")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={c.card}><SectionHeader title="Sonarr" icon="▶" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data?.stats) return null;

  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Sonarr" icon="▶" theme={theme}
        extra={<a href="https://sonarr.cinenode.org" target="_blank" rel="noopener noreferrer" className={c.headerLink}>open →</a>} />
      <div className="grid grid-cols-2 gap-2">
        <HudStat label="Series" value={data.stats.total.toString()} color={c.cyan} theme={theme} />
        <HudStat label="Monitored" value={data.stats.monitored.toString()} color={c.amber} theme={theme} />
        <HudStat label="Episodes" value={formatNumber(data.stats.downloaded)} color={c.green} theme={theme} />
        <HudStat label="Missing" value={data.stats.missing.toString()} color={data.stats.missing > 0 ? c.red : c.textMuted} theme={theme} />
      </div>
    </div>
  );
}

// ── Storage Section ──────────────────────────────────────────

function StorageSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<RadarrData | null>(null);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);

  useEffect(() => {
    fetch("/dash/api/radarr")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const storageDisk = data?.diskspace.find((d) => d.path === "/mnt/mpathae");

  if (loading) return <div className={c.card}><SectionHeader title="Storage" icon="▣" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!storageDisk) return null;

  const warn = storageDisk.usedPercent > 85;
  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Storage" icon="▣" theme={theme}
        extra={<span className={`text-[10px] font-mono ${c.textMuted}`}>cinenode.org</span>} />
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-mono ${c.textDim}`}>/storage</span>
        <span className={`text-[10px] font-mono ${warn ? c.red : c.textMuted2} tabular-nums`}>{storageDisk.freeSpace} free</span>
      </div>
      <div className={`w-full h-2 ${c.progressBg} rounded-full`}>
        <div
          className={`h-full rounded-full transition-all ${warn ? (theme === "industrial" ? "bg-[#F87171]" : "bg-terminal-red/60") : c.progressFillAlt}`}
          style={{ width: `${storageDisk.usedPercent}%` }}
        />
      </div>
      <div className={`text-[9px] font-mono ${warn ? c.red : c.textMuted2} mt-1 text-right tabular-nums`}>
        {storageDisk.usedPercent}% used — {storageDisk.totalSpace} total
      </div>
    </div>
  );
}

// ── Spotify Section ──────────────────────────────────────────

function msToTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function SpotifySection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<SpotifyData | null>(null);
  const [loading, setLoading] = useState(true);
  // Local progress counter ticked every second for smooth display
  const [localProgressMs, setLocalProgressMs] = useState(0);
  const c = cx(theme);

  useEffect(() => {
    const load = () => fetch("/dash/api/spotify")
      .then((r) => r.json())
      .then((d: SpotifyData) => {
        setData(d);
        // Reset local timer whenever we get fresh data
        setLocalProgressMs(d.track?.progressMs ?? 0);
      })
      .catch(() => {});
    load().finally(() => setLoading(false));
    const pollInterval = setInterval(load, 15_000);
    return () => clearInterval(pollInterval);
  }, []);

  // Tick local progress every second when playing
  useEffect(() => {
    if (!data?.playing || !data.track) return;
    const tick = setInterval(() => {
      setLocalProgressMs((prev) => Math.min(prev + 1000, data.track!.durationMs));
    }, 1000);
    return () => clearInterval(tick);
  }, [data]);

  if (loading) return null;

  if (!data || data.error) {
    if (data?.authUrl) {
      return (
        <div className={c.card}>
          {theme === "industrial" && <CornerBrackets color="#1DB954" size={10} />}
          <SectionHeader title="Spotify" icon="♫" theme={theme} />
          <div className={`text-xs font-mono ${c.textMuted} mb-2`}>Not connected.</div>
          <a href={data.authUrl} className={`inline-block text-[10px] font-mono px-3 py-1.5 border ${theme === "industrial" ? "border-[#1DB954] text-[#1DB954] hover:bg-[#1DB954]/10" : "border-terminal-green text-terminal-green hover:bg-terminal-green/10"} transition-all`}>
            Connect Spotify →
          </a>
        </div>
      );
    }
    return null;
  }

  if (!data.playing || !data.track) {
    return (
      <div className={c.card}>
        {theme === "industrial" && <CornerBrackets color="#1DB954" size={10} />}
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono ${c.textMuted} uppercase tracking-wider`}>Spotify</span>
          <span className={`text-[10px] font-mono ${c.textMuted2}`}>— Nothing playing</span>
        </div>
      </div>
    );
  }

  const { track } = data;
  const spotifyGreen = theme === "industrial" ? "#1DB954" : "text-terminal-green";
  const displayProgress = Math.min((localProgressMs / track.durationMs) * 100, 100);

  return (
    <div className={c.card}>
      {theme === "industrial" && <CornerBrackets color="#1DB954" size={10} />}
      <div className="flex items-center gap-3">
        {track.albumArt && (
          <a href={track.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={track.albumArt} alt="" className="w-12 h-12 object-cover" />
          </a>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span style={{ color: spotifyGreen }} className="text-[9px] font-mono uppercase tracking-widest font-bold">♫ NOW PLAYING</span>
          </div>
          <a href={track.url} target="_blank" rel="noopener noreferrer"
            className={`text-sm font-mono font-bold ${c.textMain} hover:underline truncate block leading-tight`}>
            {track.name}
          </a>
          <div className={`text-[10px] font-mono ${c.textDim} truncate`}>{track.artists}</div>
          <div className={`text-[9px] font-mono ${c.textMuted} truncate`}>{track.album}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-[10px] font-mono tabular-nums ${c.textMuted}`}>
            {msToTime(localProgressMs)} / {msToTime(track.durationMs)}
          </div>
        </div>
      </div>
      <div className={`w-full h-0.5 ${c.progressBg} mt-2 rounded-full`}>
        <div
          className="h-full rounded-full"
          style={{ width: `${displayProgress}%`, backgroundColor: spotifyGreen, transition: "width 1s linear" }}
        />
      </div>
    </div>
  );
}

// ── Now Playing Section ──────────────────────────────────────

function NowPlayingSection({ theme }: { theme: DashTheme }) {
  const [items, setItems] = useState<NowPlayingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);
  const ind = theme === "industrial";

  useEffect(() => {
    const load = () => fetch("/dash/api/nowplaying")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {});
    load().finally(() => setLoading(false));
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className={c.card}>
      {ind && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Now Playing" icon="▶" theme={theme}
        extra={<span className={c.liveTag}>LIVE</span>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={i} className={`flex gap-3 p-2 ${ind ? "bg-[#1C1D22] border border-[#252830]" : "bg-terminal-black border border-terminal-gray-light"}`}>
            {item.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbUrl} alt="" className="w-14 h-20 object-cover shrink-0" />
            ) : (
              <div className={`w-14 h-20 shrink-0 flex items-center justify-center ${c.bgAlt} ${c.textMuted2} text-[9px] font-mono`}>?</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[8px] font-mono uppercase font-bold px-1 py-0.5 ${
                  item.source === "jellyfin"
                    ? (ind ? "bg-[#A78BFA]/20 text-[#A78BFA]" : "bg-terminal-purple/20 text-terminal-purple")
                    : (ind ? "bg-[#F5A623]/20 text-[#F5A623]" : "bg-terminal-amber/20 text-terminal-amber")
                }`}>{item.source}</span>
                <span className={`text-[10px] ${item.isPaused ? c.amber : c.green}`}>{item.isPaused ? "⏸" : "▶"}</span>
              </div>
              <div className={`text-xs font-mono font-bold ${c.textMain} truncate leading-tight`}>
                {item.seriesName || item.title}
              </div>
              {item.seriesName && (
                <div className={`text-[10px] font-mono ${c.textDim} truncate`}>{item.title}</div>
              )}
              <div className={`text-[10px] font-mono ${c.textMuted} mt-1 truncate`}>{item.user}</div>
              <div className={`text-[9px] font-mono ${c.textMuted2} truncate`}>{item.device}</div>
              <div className={`w-full h-0.5 ${c.progressBg} mt-2`}>
                <div className={`h-full ${c.progressFill}`} style={{ width: `${item.progress}%` }} />
              </div>
              <div className={`text-[9px] font-mono ${c.textMuted2} mt-0.5 tabular-nums`}>{item.progress}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Weather Section ──────────────────────────────────────────

function WeatherSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);
  const ind = theme === "industrial";

  useEffect(() => {
    fetch("/dash/api/weather")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data?.current) return null;

  const { current, forecast } = data;

  return (
    <div className={c.card}>
      {ind && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Weather" icon="~" theme={theme} />
      {/* Current */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl leading-none">{current.icon}</span>
        <div>
          <div className={`text-2xl font-mono font-bold leading-none ${c.textMain}`}>{current.temp}°C</div>
          <div className={`text-[10px] font-mono ${c.textMuted} mt-0.5`}>{current.label}</div>
        </div>
        <div className="ml-auto text-right space-y-0.5">
          <div className={`text-[10px] font-mono ${c.textDim}`}>Feels {current.feelsLike}°C</div>
          <div className={`text-[10px] font-mono ${c.textMuted}`}>{current.humidity}% RH</div>
          <div className={`text-[10px] font-mono ${c.textMuted}`}>{current.windKph} km/h</div>
        </div>
      </div>
      {/* 5-day forecast */}
      <div className={`border-t ${c.border} pt-2`}>
        <div className="grid grid-cols-5 gap-1">
          {forecast.map((day, i) => (
            <div key={i} className={`text-center p-1.5 ${ind ? "bg-[#1C1D22]" : "bg-terminal-black"}`}>
              <div className={`text-[9px] font-mono ${c.textMuted} mb-0.5 capitalize`}>
                {new Date(day.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" })}
              </div>
              <div className="text-base leading-none mb-0.5">{day.icon}</div>
              <div className={`text-[10px] font-mono font-bold ${c.textMain} tabular-nums`}>{day.high}°</div>
              <div className={`text-[9px] font-mono ${c.textMuted} tabular-nums`}>{day.low}°</div>
              {day.precipChance > 0 && (
                <div className={`text-[8px] font-mono ${c.cyan} tabular-nums mt-0.5`}>{day.precipChance}%</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Prowlarr Section ─────────────────────────────────────────

function ProwlarrSection({ theme }: { theme: DashTheme }) {
  const [data, setData] = useState<ProwlarrData | null>(null);
  const [loading, setLoading] = useState(true);
  const c = cx(theme);
  const ind = theme === "industrial";

  useEffect(() => {
    fetch("/dash/api/prowlarr")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className={c.card}>
      <SectionHeader title="Prowlarr" icon="⊞" theme={theme} />
      <div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div>
    </div>
  );
  if (!data) return null;

  const maxQueries = Math.max(...data.indexers.map((idx) => idx.queries), 1);

  return (
    <div className={c.card}>
      {ind && <CornerBrackets color="#F5622A" size={10} />}
      <SectionHeader title="Prowlarr" icon="⊞" theme={theme}
        extra={<a href="https://prowlarr.cinenode.org/indexers/stats" target="_blank" rel="noopener noreferrer" className={c.headerLink}>stats →</a>} />
      <div className="grid grid-cols-3 gap-2 mb-4">
        <HudStat label="Queries" value={formatNumber(data.totals.queries)} color={c.cyan} theme={theme} />
        <HudStat label="Grabs" value={formatNumber(data.totals.grabs)} color={c.green} theme={theme} />
        <HudStat label="Indexers" value={data.totals.indexerCount.toString()} color={c.amber} theme={theme} />
      </div>
      {data.indexers.length > 0 && (
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-wider mb-2`}>Queries by indexer</div>
          <div className="space-y-2">
            {data.indexers.slice(0, 8).map((idx) => (
              <div key={idx.id}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[10px] font-mono ${c.textDim} truncate flex-1 mr-2`}>{idx.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-mono ${c.textMuted2} tabular-nums`}>{idx.queries}q</span>
                    {idx.failRate > 0 && (
                      <span className={`text-[9px] font-mono tabular-nums ${idx.failRate > 20 ? c.red : c.amber}`}>{idx.failRate}%✗</span>
                    )}
                    <span className={`text-[9px] font-mono ${c.textMuted2} tabular-nums`}>{idx.avgMs}ms</span>
                  </div>
                </div>
                <div className={`w-full h-1 ${c.progressBg}`}>
                  <div
                    className={`h-full ${c.progressFillAlt} transition-all`}
                    style={{ width: `${(idx.queries / maxQueries) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Theme Toggle ────────────────────────────────────────────

function DashThemeToggle({ theme, setTheme }: { theme: DashTheme; setTheme: (t: DashTheme) => void }) {
  const ind = theme === "industrial";
  return (
    <button
      onClick={() => setTheme(ind ? "terminal" : "industrial")}
      className={`flex items-center gap-2 px-3 py-1.5 border transition-all ${
        ind
          ? "bg-[#141619] border-[#252830] hover:border-[#F5622A]/40"
          : "bg-terminal-black-light border-terminal-gray-light hover:border-terminal-green/30"
      }`}
      title={`Switch to ${ind ? "Terminal" : "Neo-Industrial"} theme`}
    >
      <span className={`w-5 h-2.5 rounded-full relative ${ind ? "bg-[#252830]" : "bg-[#333]"}`}>
        <span className={`absolute top-0.5 w-1.5 h-1.5 rounded-full transition-transform ${
          ind ? "left-[12px] bg-[#F5622A]" : "left-0.5 bg-[#00FF41]"
        }`} />
      </span>
      <span className={`text-[10px] font-mono uppercase tracking-wider ${ind ? "text-[#9A948C]" : "text-[#888]"}`}>
        {ind ? "Neo-Industrial" : "Terminal"}
      </span>
    </button>
  );
}

// ── Media Mode Toggle ────────────────────────────────────────

function MediaModeToggle({ mode, setMode, theme }: { mode: MediaMode; setMode: (m: MediaMode) => void; theme: DashTheme }) {
  const ind = theme === "industrial";
  const options: { value: MediaMode; label: string }[] = [
    { value: "jellyfin", label: "Jellyfin" },
    { value: "both", label: "Both" },
    { value: "plex", label: "Plex" },
  ];
  return (
    <div className={`flex items-center gap-0.5 p-0.5 ${ind ? "bg-[#0D0E11] border border-[#252830]" : "bg-terminal-black border border-terminal-gray-light"}`}>
      {options.map((opt) => {
        const active = mode === opt.value;
        return (
          <button key={opt.value} onClick={() => setMode(opt.value)}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-all ${
              active
                ? ind ? "bg-[#F5622A] text-[#0D0E11] font-bold" : "bg-terminal-green text-terminal-black font-bold"
                : ind ? "text-[#5A5550] hover:text-[#9A948C]" : "text-terminal-green-dim/50 hover:text-terminal-green-dim"
            }`}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Command Palette (Cmd+K) ──────────────────────────────────

const ALL_LINKS: AppLink[] = [...PERSONAL_LINKS, ...MEDIA_LINKS, ...BOOKMARKS];

function CommandPalette({ open, onClose, theme }: { open: boolean; onClose: () => void; theme: DashTheme }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const ind = theme === "industrial";

  useEffect(() => {
    if (open) { setQuery(""); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ALL_LINKS.slice(0, 12);
    return ALL_LINKS.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 12);
  }, [query]);

  useEffect(() => { setCursor(0); }, [filtered.length]);

  const go = (link: AppLink) => { window.open(link.url, "_blank", "noopener"); onClose(); };

  if (!open) return null;

  const borderColor = ind ? "#252830" : "rgba(0,212,255,0.2)";
  const bgColor = ind ? "#0D0E11" : "#0a0a0a";
  const cardColor = ind ? "#141619" : "#0f0f0f";
  const accentColor = ind ? "#F5622A" : "#00D4FF";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 font-mono overflow-hidden"
        style={{ background: bgColor, border: `1px solid ${accentColor}`, boxShadow: `0 0 40px ${accentColor}20` }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") { onClose(); return; }
          if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
          if (e.key === "Enter" && filtered[cursor]) { go(filtered[cursor]); }
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${borderColor}` }}>
          <span style={{ color: accentColor }} className="text-xs shrink-0">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une app…"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: ind ? "#E8E4DC" : "#00D4FF", caretColor: accentColor }}
          />
          <span className="text-[10px] shrink-0" style={{ color: ind ? "#5A5550" : "rgba(0,212,255,0.35)" }}>ESC</span>
        </div>

        {/* Results */}
        <div className="py-1 max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-xs" style={{ color: ind ? "#5A5550" : "rgba(0,212,255,0.4)" }}>
              Aucun résultat pour &laquo;{query}&raquo;
            </div>
          ) : (
            filtered.map((link, i) => (
              <button
                key={link.url}
                onClick={() => go(link)}
                onMouseEnter={() => setCursor(i)}
                className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                style={{
                  background: i === cursor ? (ind ? "#1C1D22" : "rgba(0,212,255,0.06)") : "transparent",
                  borderLeft: i === cursor ? `2px solid ${accentColor}` : "2px solid transparent",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={link.icon} alt="" width={14} height={14}
                  className="shrink-0 opacity-60"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="text-xs truncate" style={{ color: i === cursor ? (ind ? "#E8E4DC" : "#00D4FF") : (ind ? "#9A948C" : "rgba(0,212,255,0.7)") }}>
                  {link.name}
                </span>
                <span className="ml-auto text-[10px] shrink-0" style={{ color: ind ? "#383530" : "rgba(0,212,255,0.25)", background: cardColor, padding: "1px 5px" }}>
                  ↵
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-4 py-2 text-[10px]" style={{ borderTop: `1px solid ${borderColor}`, color: ind ? "#5A5550" : "rgba(0,212,255,0.3)" }}>
          <span>↑↓ naviguer</span>
          <span>↵ ouvrir</span>
          <span>esc fermer</span>
        </div>
      </div>
    </div>
  );
}

// ── Tab system ───────────────────────────────────────────────

type DashTab = "start" | "media";

const TABS: { id: DashTab; label: string; icon: string }[] = [
  { id: "start", label: "Start", icon: ">" },
  { id: "media", label: "Media", icon: "▶" },
];

function TabBar({ active, onSelect, theme }: { active: DashTab; onSelect: (t: DashTab) => void; theme: DashTheme }) {
  const ind = theme === "industrial";
  return (
    <div className="flex items-center gap-1">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase tracking-widest transition-all ${
              isActive
                ? ind
                  ? "border-b-2 border-[#F5622A] text-[#F5622A]"
                  : "border-b-2 border-terminal-green text-terminal-green"
                : ind
                  ? "text-[#5A5550] hover:text-[#9A948C] border-b-2 border-transparent"
                  : "text-terminal-green-dim/50 hover:text-terminal-green-dim border-b-2 border-transparent"
            }`}
          >
            <span className="text-[10px]">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Startpage ───────────────────────────────────────────────

export default function StartPage() {
  const [time, setTime] = useState("");
  const [theme, setTheme] = useDashTheme();
  const [mediaMode, setMediaMode] = useMediaMode();
  const [tabState, setTabState] = useState<{ current: DashTab; prev: DashTab }>({ current: "start", prev: "start" });
  const [cmdOpen, setCmdOpen] = useState(false);
  const tab = tabState.current;
  const tabDir = (["start", "media"] as DashTab[]).indexOf(tabState.current) - (["start", "media"] as DashTab[]).indexOf(tabState.prev);
  const handleTabChange = useCallback((t: DashTab) => { setTabState((s) => ({ current: t, prev: s.current })); }, []);
  const c = cx(theme);
  const serviceUrls = useMemo(() => PERSONAL_LINKS.map((l) => l.url), []);
  const serviceStatus = useServiceStatus(serviceUrls);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) +
          " — " +
          now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={c.page} style={theme === "industrial" ? {
      backgroundImage: "linear-gradient(rgba(37,40,50,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(37,40,50,0.35) 1px, transparent 1px)",
      backgroundSize: "48px 48px",
    } : undefined}>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} theme={theme} />

      {/* ── Header ── */}
      <header className={`flex items-center justify-between mb-4 pb-3 border-b ${c.border}`}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="fs0ciety" width={28} height={28} className={theme === "industrial" ? "opacity-50" : "opacity-70"} />
          <div>
            <h1 className={theme === "industrial"
              ? "font-display text-xl font-black uppercase tracking-[0.18em] text-[#E8E4DC]"
              : `text-base font-bold ${c.title}`}>
              fs0ciety<span className={theme === "industrial" ? "text-[#F5622A]" : c.titleDim}>.start</span>
            </h1>
            <div className={`text-[10px] ${c.textMuted} capitalize`}>{time}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TabBar active={tab} onSelect={handleTabChange} theme={theme} />
          <span className={`mx-1 ${c.textMuted2}`}>|</span>
          <button onClick={() => setCmdOpen(true)} className={c.headerLink} title="Cmd+K">⌘K</button>
          <DashThemeToggle theme={theme} setTheme={setTheme} />
          <a href="/" className={c.headerLink}>terminal</a>
        </div>
      </header>

      {/* ── Tab content with slide transition ── */}
      <AnimatePresence mode="wait" custom={tabDir}>
        <motion.div
          key={tab}
          custom={tabDir}
          variants={{
            initial: (d: number) => ({ opacity: 0, x: d >= 0 ? 12 : -12 }),
            animate: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: d >= 0 ? -12 : 12 }),
          }}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* ── Tab: Start ── */}
          {tab === "start" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Left: Self-Hosted + Bookmarks */}
              <motion.div className="lg:col-span-3 space-y-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0 }}>
                <div className={c.card}>
                  {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
                  <SectionHeader title="Self-Hosted" icon=">" theme={theme} />
                  <div className="grid grid-cols-2 gap-0.5">
                    {PERSONAL_LINKS.map((link) => (
                      <LinkCard key={link.name} link={link} theme={theme} up={serviceStatus[link.url]} />
                    ))}
                  </div>
                </div>
                <div className={c.card}>
                  {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
                  <SectionHeader title="Bookmarks" icon="~" theme={theme} />
                  <div className="grid grid-cols-2 gap-0.5">
                    {BOOKMARKS.map((link) => <LinkCard key={link.name} link={link} theme={theme} />)}
                  </div>
                </div>
              </motion.div>

              {/* Center: RSS */}
              <motion.div className="lg:col-span-6"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}>
                <RSSFeed theme={theme} />
              </motion.div>

              {/* Right: Weather + Spotify + Calendar + AdGuard compact */}
              <motion.div className="lg:col-span-3 space-y-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.10 }}>
                <WeatherSection theme={theme} />
                <SpotifySection theme={theme} />
                <Calendar theme={theme} />
                <AdGuardSection theme={theme} compact />
              </motion.div>
            </div>
          )}

          {/* ── Tab: Media ── */}
          {tab === "media" && (
            <div className="space-y-3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0 }}>
                <div className={c.card}>
                  {theme === "industrial" && <CornerBrackets color="#F5622A" size={10} />}
                  <div className="flex items-center gap-2 flex-wrap">
                    {MEDIA_LINKS.map((link) => (
                      <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                        className={`group flex items-center gap-2 px-3 py-1.5 border transition-all ${
                          theme === "industrial"
                            ? "bg-[#141619] border-[#252830] hover:border-[#F5622A]/40 hover:bg-[#1C1D22]"
                            : "border-terminal-gray-light bg-terminal-black-light hover:border-terminal-green/40 hover:bg-terminal-green/5"
                        }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={link.icon} alt="" width={16} height={16}
                          className="opacity-50 group-hover:opacity-100 transition-opacity"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <span className={c.mediaIconLabel + " text-[10px]"}>{link.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.07 }}>
                <MediaRequestSection theme={theme} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.10 }}>
                <NowPlayingSection theme={theme} />
              </motion.div>

              <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.13 }}>
                <QBitSection theme={theme} />
                <SABSection theme={theme} />
                <SeerrSection theme={theme} />
              </motion.div>

              <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-3"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.17 }}>
                <RadarrSection theme={theme} />
                <SonarrSection theme={theme} />
                <StorageSection theme={theme} />
                <MetricsSection theme={theme} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.21 }}>
                <ProwlarrSection theme={theme} />
              </motion.div>

              <motion.div className="flex items-center justify-between"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.25 }}>
                <span className={`text-[9px] font-mono ${c.textMuted} uppercase tracking-wider`}>Media Server</span>
                <MediaModeToggle mode={mediaMode} setMode={setMediaMode} theme={theme} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.29 }}>
                <div className="space-y-3">
                  {(mediaMode === "jellyfin" || mediaMode === "both") && <JellyfinSection theme={theme} />}
                  {(mediaMode === "plex" || mediaMode === "both") && <PlexSection theme={theme} />}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Footer ── */}
      <footer className={`mt-4 pt-3 border-t ${c.border}`}>
        <div className={`flex items-center justify-between text-[10px] font-mono ${c.textMuted2}`}>
          <span>fs0ciety.org</span>
          <span>
            <a href="https://fs0ciety.org/blog" className={`hover:${c.accent} transition-colors`}>blog</a>
            {" / "}
            <a href="https://fs0ciety.org/blog/pgp" className={`hover:${c.accent} transition-colors`}>pgp</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
