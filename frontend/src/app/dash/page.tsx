"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

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
  recent: Array<{
    id: string;
    name: string;
    type: string;
    seriesName?: string;
    year?: number;
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
    name: string;
    size: string;
    progress: number;
    dlspeed: string;
    eta: number | null;
    state: string;
    category: string;
  }>;
}

interface SABData {
  speed: string;
  speedBps: number;
  queue: {
    count: number;
    active: Array<{
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
    page: ind
      ? "min-h-screen bg-[#F5F2EE] p-4 md:p-6 lg:p-8 font-mono dash-industrial"
      : "min-h-screen bg-terminal-black p-4 md:p-6 lg:p-8 font-mono",
    card: ind
      ? "bg-white border border-[#E7E5E4] rounded-xl shadow-sm p-5"
      : "border border-terminal-green/20 bg-terminal-black-light p-4",
    cardHover: ind
      ? "bg-white border border-[#E7E5E4] rounded-xl shadow-sm hover:shadow-md hover:border-[#E8613C]/30 transition-all"
      : "border border-terminal-gray-light bg-terminal-black-light hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all",
    title: ind ? "text-[#1C1917]" : "text-terminal-green",
    titleDim: ind ? "text-[#78716C]" : "text-terminal-green-dim",
    textMain: ind ? "text-[#1C1917]" : "text-terminal-green",
    textDim: ind ? "text-[#78716C]" : "text-terminal-green-dim",
    textMuted: ind ? "text-[#A8A29E]" : "text-terminal-green-dim/50",
    textMuted2: ind ? "text-[#D6D3D1]" : "text-terminal-green-dim/30",
    accent: ind ? "text-[#E8613C]" : "text-terminal-amber",
    link: ind ? "text-[#2563EB]" : "text-terminal-cyan",
    green: ind ? "text-[#16A34A]" : "text-terminal-green",
    red: ind ? "text-[#DC2626]" : "text-terminal-red",
    amber: ind ? "text-[#D97706]" : "text-terminal-amber",
    cyan: ind ? "text-[#2563EB]" : "text-terminal-cyan",
    purple: ind ? "text-[#7C3AED]" : "text-terminal-purple",
    border: ind ? "border-[#E7E5E4]" : "border-terminal-gray-light",
    borderAccent: ind ? "border-[#E8613C]/30" : "border-terminal-green/20",
    bg: ind ? "bg-[#F5F2EE]" : "bg-terminal-black",
    bgCard: ind ? "bg-white" : "bg-terminal-black",
    bgAlt: ind ? "bg-[#EEEBE6]" : "bg-terminal-black-light",
    statBox: ind
      ? "bg-[#EEEBE6] border border-[#E7E5E4] rounded-lg p-3"
      : "border border-terminal-gray-light bg-terminal-black p-3",
    linkCard: ind
      ? "group flex items-center gap-3 px-3 py-2.5 bg-white border border-[#E7E5E4] rounded-lg hover:border-[#E8613C]/30 hover:shadow-sm transition-all"
      : "group flex items-center gap-3 px-3 py-2.5 border border-terminal-gray-light bg-terminal-black-light hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all",
    linkIcon: ind
      ? "opacity-70 group-hover:opacity-100 transition-opacity shrink-0"
      : "opacity-60 group-hover:opacity-100 transition-opacity shrink-0",
    linkText: ind
      ? "text-xs font-mono text-[#78716C] group-hover:text-[#1C1917] transition-colors truncate"
      : "text-xs font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors truncate",
    linkArrow: ind
      ? "ml-auto text-[#D6D3D1] text-[10px] group-hover:text-[#E8613C] transition-colors shrink-0"
      : "ml-auto text-terminal-green-dim/30 text-[10px] group-hover:text-terminal-green/50 transition-colors shrink-0",
    sectionIcon: ind ? "text-[#E8613C] text-xs" : "text-terminal-amber text-xs",
    sectionTitle: ind
      ? "text-xs font-mono text-[#1C1917] uppercase tracking-wider font-bold"
      : "text-xs font-mono text-terminal-green uppercase tracking-wider font-bold",
    sectionBorder: ind ? "border-b border-[#E7E5E4]" : "border-b border-terminal-gray-light",
    progressBg: ind ? "bg-[#E7E5E4]" : "bg-terminal-green/10",
    progressFill: ind ? "bg-[#E8613C]" : "bg-terminal-green/60",
    progressFillAlt: ind ? "bg-[#2563EB]" : "bg-terminal-cyan/60",
    chartColor1: ind ? "#E8613C" : "#00D4FF",
    chartColor2: ind ? "#DC2626" : "#FF0033",
    liveTag: ind ? "text-[10px] font-mono text-[#E8613C] animate-pulse" : "text-[10px] font-mono text-terminal-green animate-pulse",
    headerLink: ind
      ? "text-xs text-[#78716C] hover:text-[#E8613C] transition-colors border border-[#E7E5E4] px-3 py-1 rounded-lg"
      : "text-xs text-terminal-green-dim hover:text-terminal-green transition-colors border border-terminal-green/20 px-3 py-1",
    headerLinkActive: ind
      ? "text-xs text-[#2563EB] hover:text-[#E8613C] transition-colors border border-[#2563EB]/20 px-3 py-1 rounded-lg"
      : "text-xs text-terminal-cyan hover:text-terminal-green transition-colors border border-terminal-cyan/20 px-3 py-1",
    mediaIcon: ind
      ? "group flex flex-col items-center gap-1.5 py-2 px-1 bg-white border border-[#E7E5E4] rounded-lg hover:border-[#E8613C]/30 hover:shadow-sm transition-all"
      : "group flex flex-col items-center gap-1.5 py-2 px-1 border border-terminal-gray-light bg-terminal-black hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all",
    mediaIconLabel: ind
      ? "text-[9px] font-mono text-[#78716C] group-hover:text-[#1C1917] transition-colors"
      : "text-[9px] font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors",
    imgThumb: ind
      ? "w-10 h-14 object-cover shrink-0 border border-[#E7E5E4] rounded"
      : "w-10 h-14 object-cover shrink-0 border border-terminal-green/20",
  };
}

// ── Shared Components ───────────────────────────────────────

function LinkCard({ link, theme }: { link: AppLink; theme: DashTheme }) {
  const c = cx(theme);
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={c.linkCard}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={link.icon} alt="" width={20} height={20}
        className={c.linkIcon}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className={c.linkText}>{link.name}</span>
      <span className={c.linkArrow}>&rarr;</span>
    </a>
  );
}

function SectionHeader({ title, icon, extra, theme }: { title: string; icon: string; extra?: React.ReactNode; theme: DashTheme }) {
  const c = cx(theme);
  return (
    <div className={`flex items-center gap-2 mb-3 pb-2 ${c.sectionBorder}`}>
      <span className={c.sectionIcon}>{icon}</span>
      <h2 className={c.sectionTitle}>{title}</h2>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}

function StatBox({ label, value, sub, color, theme }: { label: string; value: string; sub?: string; color?: string; theme: DashTheme }) {
  const c = cx(theme);
  const defaultColor = theme === "industrial" ? "text-[#1C1917]" : "text-terminal-green";
  return (
    <div className={c.statBox}>
      <div className={`text-[10px] font-mono ${c.textMuted} uppercase tracking-wider mb-1`}>{label}</div>
      <div className={`text-lg font-bold font-mono tabular-nums ${color || defaultColor}`}>{value}</div>
      {sub && <div className={`text-[10px] font-mono ${c.textMuted2} mt-0.5`}>{sub}</div>}
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
        Korben: "text-[#D97706]", "The Verge": "text-[#2563EB]", Wired: "text-[#7C3AED]",
        TechCrunch: "text-[#16A34A]", fs0ciety: "text-[#DC2626]",
      };
      return map[src] || "text-[#78716C]";
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
        <div className="space-y-0.5 max-h-[360px] overflow-y-auto">
          {items.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
              className={`group flex items-start gap-2 py-1.5 px-1 ${theme === "industrial" ? "hover:bg-[#EEEBE6]" : "hover:bg-terminal-green/5"} transition-colors rounded-sm`}>
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
      if (isSelected) return "bg-[#E8613C] text-white font-bold rounded-lg";
      if (isToday) return "text-[#E8613C] font-bold border border-[#E8613C]/30 rounded-lg";
      return "text-[#78716C] hover:bg-[#EEEBE6] rounded-lg";
    }
    if (isSelected) return "bg-terminal-green text-terminal-black font-bold";
    if (isToday) return "text-terminal-green font-bold border border-terminal-green/40";
    return "text-terminal-green-dim hover:bg-terminal-green/10";
  };

  const dotColor = theme === "industrial" ? "bg-[#E8613C]" : "bg-terminal-amber";

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
              <div key={i} className={`flex items-start gap-2 py-1.5 px-2 border-l-2 ${theme === "industrial" ? "border-[#E8613C] bg-[#E8613C]/5 rounded-r-lg" : "border-terminal-amber bg-terminal-amber/5"}`}>
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
  const c = cx(theme);

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
  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.counts && (
        <div className={c.card}>
          <SectionHeader title="Jellyfin Library" icon=">" theme={theme} />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <StatBox label="Movies" value={formatNumber(data.counts.movies)} color={c.amber} theme={theme} />
            <StatBox label="Series" value={formatNumber(data.counts.series)} color={c.cyan} theme={theme} />
            <StatBox label="Episodes" value={formatNumber(data.counts.episodes)} color={c.green} theme={theme} />
            <StatBox label="Artists" value={formatNumber(data.counts.artists)} color={c.purple} theme={theme} />
            <StatBox label="Albums" value={formatNumber(data.counts.albums)} color={c.amber} theme={theme} />
            <StatBox label="Songs" value={formatNumber(data.counts.songs)} color={c.cyan} theme={theme} />
          </div>
        </div>
      )}

      {data.nowPlaying.length > 0 && (
        <div className={c.card}>
          <SectionHeader title="Now Playing" icon="▶" theme={theme}
            extra={<span className={c.liveTag}>LIVE</span>} />
          <div className="space-y-3">
            {data.nowPlaying.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {s.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt="" className={c.imgThumb} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono ${c.textMain} truncate`}>
                    {s.seriesName ? `${s.seriesName} — ${s.title}` : s.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-mono ${c.textDim}`}>{s.user}</span>
                    <span className={`text-[10px] font-mono ${c.cyan} tabular-nums`}>{s.progress}%</span>
                    <span className={`text-[10px] ${s.isPaused ? c.amber : c.green}`}>
                      {s.isPaused ? "⏸" : "▶"}
                    </span>
                    <span className={`text-[10px] font-mono ${c.textMuted2}`}>{s.device}</span>
                  </div>
                  <div className={`w-full h-0.5 ${c.progressBg} mt-1`}>
                    <div className={`h-full ${c.progressFill} transition-all`} style={{ width: `${s.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.recent.length > 0 && (
        <div className={c.card}>
          <SectionHeader title="Recently Added" icon="+" theme={theme} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {data.recent.map((item) => (
              <a key={item.id} href={`https://jellyfin.cinenode.org/web/#!/details?id=${item.id}`} target="_blank" rel="noopener noreferrer"
                className={`group overflow-hidden ${theme === "industrial" ? "bg-white border border-[#E7E5E4] rounded-lg hover:border-[#E8613C]/30 hover:shadow-sm" : "border border-terminal-gray-light bg-terminal-black hover:border-terminal-green/40"} transition-all`}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-full h-28 object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className={`w-full h-28 ${c.bgAlt} flex items-center justify-center ${c.textMuted2} text-xs font-mono`}>
                    {item.type === "Movie" ? "Film" : "TV"}
                  </div>
                )}
                <div className="p-1.5">
                  <div className={`text-[10px] font-mono ${c.textDim} group-hover:${c.textMain} truncate transition-colors`}>
                    {item.seriesName || item.name}
                  </div>
                  {item.seriesName && (
                    <div className={`text-[9px] font-mono ${c.textMuted2} truncate`}>{item.name}</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AdGuard Section ─────────────────────────────────────────

function AdGuardSection({ theme }: { theme: DashTheme }) {
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
      <SectionHeader title="AdGuard Home" icon="!" theme={theme}
        extra={<span className={`text-[10px] font-mono ${running ? c.green : c.red}`}>{running ? "● RUNNING" : "● DOWN"}</span>} />
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatBox label="Queries" value={formatNumber(stats.totalQueries)} color={c.cyan} theme={theme} />
        <StatBox label="Blocked" value={formatNumber(stats.blockedFiltering)} sub={`${blockRate}%`} color={c.red} theme={theme} />
        <StatBox label="Avg Latency" value={`${(stats.avgProcessingTime * 1000).toFixed(1)}ms`} color={c.amber} theme={theme} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-1`}>DNS Queries (24h)</div>
          <MiniChart data={stats.dnsQueries} color={c.chartColor1} height={50} />
        </div>
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-1`}>Blocked (24h)</div>
          <MiniChart data={stats.blockedSeries} color={c.chartColor2} height={50} />
        </div>
      </div>
      {stats.topBlocked.length > 0 && (
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-1`}>Top Blocked</div>
          <div className="space-y-0.5">
            {stats.topBlocked.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] font-mono gap-2">
                <span className={`${c.red} truncate flex-1`}>{d.domain}</span>
                <span className={`${c.textMuted2} tabular-nums shrink-0`}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>
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
        pending: "text-[#D97706]", approved: "text-[#2563EB]", available: "text-[#16A34A]",
        declined: "text-[#DC2626]", processing: "text-[#7C3AED]",
      };
      return map[status] || "text-[#78716C]";
    }
    return STATUS_COLORS[status] || "text-terminal-green-dim";
  };

  if (loading) return <div className={c.card}><SectionHeader title="Seerr" icon="?" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data) return null;

  return (
    <div className={c.card}>
      <SectionHeader title="Seerr Requests" icon="?" theme={theme} />
      {data.counts && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBox label="Available" value={`${data.counts.available}/${data.counts.total}`} color={c.green} theme={theme} />
          <StatBox label="Pending" value={data.counts.pending.toString()} color={c.amber} theme={theme} />
          <StatBox label="Approved" value={data.counts.approved.toString()} color={c.cyan} theme={theme} />
        </div>
      )}
      {data.requests.length > 0 && (
        <div className="space-y-2">
          {data.requests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 py-1.5">
              {req.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={req.posterUrl} alt="" className={`w-8 h-12 object-cover shrink-0 ${theme === "industrial" ? "border border-[#E7E5E4] rounded" : "border border-terminal-gray-light"}`} />
              ) : (
                <div className={`w-8 h-12 shrink-0 flex items-center justify-center ${theme === "industrial" ? "bg-[#EEEBE6] border border-[#E7E5E4] rounded" : "bg-terminal-gray border border-terminal-gray-light"}`}>
                  <span className={`text-[8px] font-mono ${c.textMuted2}`}>{req.type === "movie" ? "F" : "TV"}</span>
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
  const c = cx(theme);

  useEffect(() => {
    const load = () => fetch("/dash/api/qbit")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {});

    load().finally(() => setLoading(false));
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className={c.card}><SectionHeader title="qBittorrent" icon="↓" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data) return null;

  const hasActive = data.activeDownloads.length > 0;

  return (
    <div className={c.card}>
      <SectionHeader title="qBittorrent" icon="↓" theme={theme}
        extra={hasActive ? <span className={c.liveTag}>LIVE</span> : undefined} />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {data.counts && (
          <>
            <StatBox label="Total" value={data.counts.total.toString()} theme={theme} />
            <StatBox label="Downloading" value={data.counts.downloading.toString()} color={c.cyan} theme={theme} />
            <StatBox label="Seeding" value={data.counts.seeding.toString()} color={c.green} theme={theme} />
            <StatBox label="Paused" value={data.counts.paused.toString()} color={c.textDim} theme={theme} />
          </>
        )}
      </div>

      {/* Transfer stats */}
      {data.transfer && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <StatBox label="DL Speed" value={data.transfer.dlSpeed} color={c.cyan} theme={theme} />
          <StatBox label="UL Speed" value={data.transfer.ulSpeed} color={c.amber} theme={theme} />
          <StatBox label="Total DL" value={data.transfer.totalDownloaded} color={c.accent} theme={theme} />
          <StatBox label="Total UL" value={data.transfer.totalUploaded} color={c.textDim} theme={theme} />
        </div>
      )}

      {/* Active downloads */}
      {hasActive && (
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-2`}>Active Downloads</div>
          <div className="space-y-2">
            {data.activeDownloads.map((dl, i) => (
              <div key={i} className={`p-2 ${theme === "industrial" ? "bg-[#EEEBE6] rounded-lg" : "bg-terminal-black border border-terminal-gray-light"}`}>
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
  const c = cx(theme);

  useEffect(() => {
    const load = () => fetch("/dash/api/sabnzbd")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {});

    load().finally(() => setLoading(false));
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className={c.card}><SectionHeader title="SABnzbd" icon="↧" theme={theme} /><div className={`text-xs font-mono ${c.textDim} animate-pulse`}>Loading...</div></div>;
  if (!data) return null;

  const hasActive = data.queue.active.length > 0;

  return (
    <div className={c.card}>
      <SectionHeader title="SABnzbd" icon="↧" theme={theme}
        extra={hasActive ? <span className={c.liveTag}>LIVE</span> : undefined} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatBox label="Speed" value={data.speed} color={c.cyan} theme={theme} />
        <StatBox label="Queue" value={data.queue.count.toString()} color={c.amber} theme={theme} />
        <StatBox label="This Month" value={data.stats.monthDownloaded} color={c.accent} theme={theme} />
        <StatBox label="All Time" value={data.stats.totalDownloaded} theme={theme} />
      </div>

      {/* Active downloads */}
      {hasActive && (
        <div>
          <div className={`text-[9px] font-mono ${c.textMuted} uppercase mb-2`}>Active Downloads</div>
          <div className="space-y-2">
            {data.queue.active.map((dl, i) => (
              <div key={i} className={`p-2 ${theme === "industrial" ? "bg-[#EEEBE6] rounded-lg" : "bg-terminal-black border border-terminal-gray-light"}`}>
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

// ── Theme Toggle ────────────────────────────────────────────

function DashThemeToggle({ theme, setTheme }: { theme: DashTheme; setTheme: (t: DashTheme) => void }) {
  const ind = theme === "industrial";
  return (
    <button
      onClick={() => setTheme(ind ? "terminal" : "industrial")}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
        ind
          ? "bg-white border-[#E7E5E4] hover:border-[#E8613C]/30 shadow-sm"
          : "bg-terminal-black-light border-terminal-gray-light hover:border-terminal-green/30"
      }`}
      title={`Switch to ${ind ? "Terminal" : "Industrial"} theme`}
    >
      <span className={`w-5 h-2.5 rounded-full relative ${ind ? "bg-[#D6D3D1]" : "bg-[#333]"}`}>
        <span className={`absolute top-0.5 w-1.5 h-1.5 rounded-full transition-transform ${
          ind ? "left-[12px] bg-[#E8613C]" : "left-0.5 bg-[#00FF41]"
        }`} />
      </span>
      <span className={`text-[10px] font-mono uppercase tracking-wider ${ind ? "text-[#78716C]" : "text-[#888]"}`}>
        {ind ? "Industrial" : "Terminal"}
      </span>
    </button>
  );
}

// ── Startpage ───────────────────────────────────────────────

export default function StartPage() {
  const [time, setTime] = useState("");
  const [theme, setTheme] = useDashTheme();
  const c = cx(theme);

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
    <div className={c.page}>
      {/* Header */}
      <header className={`flex items-center justify-between mb-6 pb-4 border-b ${c.border} ${theme === "industrial" ? "bg-transparent" : ""}`}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="fs0ciety" width={32} height={32} className={theme === "industrial" ? "opacity-50" : "opacity-70"} />
          <div>
            <h1 className={`text-lg md:text-xl font-bold ${c.title}`}>
              fs0ciety<span className={c.titleDim}>.start</span>
            </h1>
            <div className={`text-[10px] ${c.textMuted} capitalize`}>{time}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DashThemeToggle theme={theme} setTheme={setTheme} />
          <a href="/" className={c.headerLink}>terminal</a>
          <a href="/dashboard" className={c.headerLinkActive}>seedbox</a>
        </div>
      </header>

      {/* Top row: Links + RSS + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-6">
        {/* Left: Links */}
        <div className="lg:col-span-3 space-y-4">
          <div className={c.card}>
            <SectionHeader title="Self-Hosted" icon=">" theme={theme} />
            <div className="grid grid-cols-1 gap-1">
              {PERSONAL_LINKS.map((link) => <LinkCard key={link.name} link={link} theme={theme} />)}
            </div>
          </div>
          <div className={c.card}>
            <SectionHeader title="Bookmarks" icon="~" theme={theme} />
            <div className="grid grid-cols-1 gap-1">
              {BOOKMARKS.map((link) => <LinkCard key={link.name} link={link} theme={theme} />)}
            </div>
          </div>
        </div>

        {/* Center: RSS */}
        <div className="lg:col-span-6 space-y-4">
          <RSSFeed theme={theme} />

          {/* Media Links */}
          <div className={c.card}>
            <SectionHeader title="Media Stack" icon="%" theme={theme} />
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
              {MEDIA_LINKS.map((link) => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className={c.mediaIcon}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={link.icon} alt="" width={20} height={20}
                    className="opacity-50 group-hover:opacity-100 transition-opacity"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <span className={c.mediaIconLabel}>{link.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Calendar */}
        <div className="lg:col-span-3">
          <Calendar theme={theme} />
        </div>
      </div>

      {/* Downloads Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
        <QBitSection theme={theme} />
        <SABSection theme={theme} />
      </div>

      {/* Media Section */}
      <div className="space-y-6 mb-6">
        <JellyfinSection theme={theme} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdGuardSection theme={theme} />
          <SeerrSection theme={theme} />
        </div>
      </div>

      {/* Footer */}
      <footer className={`pt-4 border-t ${c.border}`}>
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
