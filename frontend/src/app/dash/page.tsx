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

// ── Shared Components ───────────────────────────────────────

function LinkCard({ link }: { link: AppLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-3 py-2.5 border border-terminal-gray-light bg-terminal-black-light hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={link.icon}
        alt=""
        width={20}
        height={20}
        className="opacity-60 group-hover:opacity-100 transition-opacity shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="text-xs font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors truncate">
        {link.name}
      </span>
      <span className="ml-auto text-terminal-green-dim/30 text-[10px] group-hover:text-terminal-green/50 transition-colors shrink-0">
        &rarr;
      </span>
    </a>
  );
}

function SectionHeader({ title, icon, extra }: { title: string; icon: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-terminal-gray-light">
      <span className="text-terminal-amber text-xs">{icon}</span>
      <h2 className="text-xs font-mono text-terminal-green uppercase tracking-wider font-bold">{title}</h2>
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}

function StatBox({ label, value, sub, color = "text-terminal-green" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="border border-terminal-gray-light bg-terminal-black p-3">
      <div className="text-[10px] font-mono text-terminal-green-dim/50 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-terminal-green-dim/40 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Mini ASCII chart for AdGuard ────────────────────────────

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

function RSSFeed() {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/dash/api/rss")
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
      <SectionHeader title="RSS Feeds" icon="$" />
      {loading ? (
        <div className="text-xs font-mono text-terminal-green-dim animate-pulse py-4">Fetching feeds...</div>
      ) : items.length === 0 ? (
        <div className="text-xs font-mono text-terminal-green-dim/50 py-4">No feed items available.</div>
      ) : (
        <div className="space-y-0.5 max-h-[360px] overflow-y-auto">
          {items.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 py-1.5 px-1 hover:bg-terminal-green/5 transition-colors rounded-sm">
              <span className={`text-[10px] font-mono shrink-0 w-16 uppercase font-bold ${SOURCE_COLORS[item.source] || "text-terminal-green-dim"}`}>
                {item.source}
              </span>
              <span className="text-xs font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors flex-1 min-w-0 line-clamp-2">
                {item.title}
              </span>
              {item.pubDate && (
                <span className="text-[10px] font-mono text-terminal-green-dim/40 shrink-0 tabular-nums">{timeAgo(item.pubDate)}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calendar ────────────────────────────────────────────────

function Calendar() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(new Date());

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

  return (
    <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
      <SectionHeader title="Calendar" icon="#" />
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green px-2 py-1 transition-colors">&laquo;</button>
        <span className="text-xs font-mono text-terminal-green capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green px-2 py-1 transition-colors">&raquo;</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((d) => (
          <div key={d} className="text-center text-[10px] font-mono text-terminal-green-dim/50 py-1">{d}</div>
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
            <button key={`d-${day}`} onClick={() => setSelectedDate(dateObj)} className={`h-7 text-[11px] font-mono transition-colors relative ${isSelected ? "bg-terminal-green text-terminal-black font-bold" : isToday ? "text-terminal-green font-bold border border-terminal-green/40" : "text-terminal-green-dim hover:bg-terminal-green/10"}`}>
              {day}
              {hasEvent && !isSelected && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-terminal-amber" />}
            </button>
          );
        })}
      </div>
      <div className="border-t border-terminal-gray-light pt-3">
        <div className="text-[10px] font-mono text-terminal-green-dim/50 mb-2 uppercase tracking-wider">
          {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        {loading ? (
          <div className="text-xs font-mono text-terminal-green-dim animate-pulse">Loading...</div>
        ) : dayEvents.length === 0 ? (
          <div className="text-xs font-mono text-terminal-green-dim/30 py-2">No events</div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 py-1.5 px-2 border-l-2 border-terminal-amber bg-terminal-amber/5">
                <span className="text-[10px] font-mono text-terminal-amber shrink-0 tabular-nums mt-0.5">{formatEventTime(ev.dtstart)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-terminal-green truncate">{ev.summary}</div>
                  {ev.location && <div className="text-[10px] font-mono text-terminal-green-dim/50 truncate">{ev.location}</div>}
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

function JellyfinSection() {
  const [data, setData] = useState<JellyfinData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="border border-terminal-green/20 bg-terminal-black-light p-4"><SectionHeader title="Jellyfin" icon=">" /><div className="text-xs font-mono text-terminal-green-dim animate-pulse">Loading...</div></div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      {data.counts && (
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
          <SectionHeader title="Jellyfin Library" icon=">" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <StatBox label="Movies" value={formatNumber(data.counts.movies)} color="text-terminal-amber" />
            <StatBox label="Series" value={formatNumber(data.counts.series)} color="text-terminal-cyan" />
            <StatBox label="Episodes" value={formatNumber(data.counts.episodes)} color="text-terminal-green" />
            <StatBox label="Artists" value={formatNumber(data.counts.artists)} color="text-terminal-purple" />
            <StatBox label="Albums" value={formatNumber(data.counts.albums)} color="text-terminal-amber" />
            <StatBox label="Songs" value={formatNumber(data.counts.songs)} color="text-terminal-cyan" />
          </div>
        </div>
      )}

      {/* Now Playing */}
      {data.nowPlaying.length > 0 && (
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
          <SectionHeader
            title="Now Playing"
            icon="▶"
            extra={<span className="text-[10px] font-mono text-terminal-green animate-pulse">LIVE</span>}
          />
          <div className="space-y-3">
            {data.nowPlaying.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                {s.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt="" className="w-10 h-14 object-cover shrink-0 border border-terminal-green/20" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-terminal-green truncate">
                    {s.seriesName ? `${s.seriesName} — ${s.title}` : s.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-terminal-green-dim">{s.user}</span>
                    <span className="text-[10px] font-mono text-terminal-cyan tabular-nums">{s.progress}%</span>
                    <span className={`text-[10px] ${s.isPaused ? "text-terminal-amber" : "text-terminal-green"}`}>
                      {s.isPaused ? "⏸" : "▶"}
                    </span>
                    <span className="text-[10px] font-mono text-terminal-green-dim/40">{s.device}</span>
                  </div>
                  <div className="w-full h-0.5 bg-terminal-green/10 mt-1">
                    <div className="h-full bg-terminal-green/60 transition-all" style={{ width: `${s.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Additions */}
      {data.recent.length > 0 && (
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
          <SectionHeader title="Recently Added" icon="+" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {data.recent.map((item) => (
              <a
                key={item.id}
                href={`https://jellyfin.cinenode.org/web/#!/details?id=${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group border border-terminal-gray-light bg-terminal-black hover:border-terminal-green/40 transition-all overflow-hidden"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="w-full h-28 object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="w-full h-28 bg-terminal-gray flex items-center justify-center text-terminal-green-dim/30 text-xs font-mono">
                    {item.type === "Movie" ? "Film" : "TV"}
                  </div>
                )}
                <div className="p-1.5">
                  <div className="text-[10px] font-mono text-terminal-green-dim group-hover:text-terminal-green truncate transition-colors">
                    {item.seriesName || item.name}
                  </div>
                  {item.seriesName && (
                    <div className="text-[9px] font-mono text-terminal-green-dim/40 truncate">{item.name}</div>
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

function AdGuardSection() {
  const [data, setData] = useState<AdGuardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/dash/api/adguard")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="border border-terminal-green/20 bg-terminal-black-light p-4"><SectionHeader title="AdGuard Home" icon="!" /><div className="text-xs font-mono text-terminal-green-dim animate-pulse">Loading...</div></div>;
  if (!data?.stats) return null;

  const { stats, running } = data;
  const blockRate = stats.totalQueries > 0 ? ((stats.blockedFiltering / stats.totalQueries) * 100).toFixed(1) : "0";

  return (
    <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
      <SectionHeader
        title="AdGuard Home"
        icon="!"
        extra={<span className={`text-[10px] font-mono ${running ? "text-terminal-green" : "text-terminal-red"}`}>{running ? "● RUNNING" : "● DOWN"}</span>}
      />
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatBox label="Queries" value={formatNumber(stats.totalQueries)} color="text-terminal-cyan" />
        <StatBox label="Blocked" value={formatNumber(stats.blockedFiltering)} sub={`${blockRate}%`} color="text-terminal-red" />
        <StatBox label="Avg Latency" value={`${(stats.avgProcessingTime * 1000).toFixed(1)}ms`} color="text-terminal-amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <div className="text-[9px] font-mono text-terminal-green-dim/50 uppercase mb-1">DNS Queries (24h)</div>
          <MiniChart data={stats.dnsQueries} color="#00D4FF" height={50} />
        </div>
        <div>
          <div className="text-[9px] font-mono text-terminal-green-dim/50 uppercase mb-1">Blocked (24h)</div>
          <MiniChart data={stats.blockedSeries} color="#FF0033" height={50} />
        </div>
      </div>

      {/* Top Blocked */}
      {stats.topBlocked.length > 0 && (
        <div>
          <div className="text-[9px] font-mono text-terminal-green-dim/50 uppercase mb-1">Top Blocked</div>
          <div className="space-y-0.5">
            {stats.topBlocked.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] font-mono gap-2">
                <span className="text-terminal-red truncate flex-1">{d.domain}</span>
                <span className="text-terminal-green-dim/40 tabular-nums shrink-0">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Seerr Section ───────────────────────────────────────────

function SeerrSection() {
  const [data, setData] = useState<SeerrData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/dash/api/seerr")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="border border-terminal-green/20 bg-terminal-black-light p-4"><SectionHeader title="Seerr" icon="?" /><div className="text-xs font-mono text-terminal-green-dim animate-pulse">Loading...</div></div>;
  if (!data) return null;

  return (
    <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
      <SectionHeader title="Seerr Requests" icon="?" />

      {/* Counts */}
      {data.counts && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatBox
            label="Available"
            value={`${data.counts.available}/${data.counts.total}`}
            color="text-terminal-green"
          />
          <StatBox label="Pending" value={data.counts.pending.toString()} color="text-terminal-amber" />
          <StatBox label="Approved" value={data.counts.approved.toString()} color="text-terminal-cyan" />
        </div>
      )}

      {/* Recent Requests */}
      {data.requests.length > 0 && (
        <div className="space-y-2">
          {data.requests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 py-1.5">
              {req.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={req.posterUrl} alt="" className="w-8 h-12 object-cover shrink-0 border border-terminal-gray-light" />
              ) : (
                <div className="w-8 h-12 bg-terminal-gray shrink-0 border border-terminal-gray-light flex items-center justify-center">
                  <span className="text-[8px] font-mono text-terminal-green-dim/30">{req.type === "movie" ? "F" : "TV"}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-terminal-green-dim truncate">{req.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-mono font-bold uppercase ${STATUS_COLORS[req.status] || "text-terminal-green-dim"}`}>
                    {req.status}
                  </span>
                  <span className="text-[10px] font-mono text-terminal-green-dim/40">{req.requestedBy}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-terminal-green-dim/30 shrink-0 tabular-nums">
                {timeAgo(req.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Startpage ───────────────────────────────────────────────

export default function StartPage() {
  const [time, setTime] = useState("");

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
    <div className="min-h-screen bg-terminal-black p-4 md:p-6 lg:p-8 font-mono">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 pb-4 border-b border-terminal-gray-light">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="fs0ciety" width={32} height={32} className="opacity-70" />
          <div>
            <h1 className="text-lg md:text-xl font-bold text-terminal-green">
              fs0ciety<span className="text-terminal-green-dim">.start</span>
            </h1>
            <div className="text-[10px] text-terminal-green-dim/50 capitalize">{time}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs text-terminal-green-dim hover:text-terminal-green transition-colors border border-terminal-green/20 px-3 py-1">terminal</a>
          <a href="/dashboard" className="text-xs text-terminal-cyan hover:text-terminal-green transition-colors border border-terminal-cyan/20 px-3 py-1">seedbox</a>
        </div>
      </header>

      {/* Top row: Links + RSS + Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-6">
        {/* Left: Links */}
        <div className="lg:col-span-3 space-y-4">
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <SectionHeader title="Self-Hosted" icon=">" />
            <div className="grid grid-cols-1 gap-1">
              {PERSONAL_LINKS.map((link) => <LinkCard key={link.name} link={link} />)}
            </div>
          </div>
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <SectionHeader title="Bookmarks" icon="~" />
            <div className="grid grid-cols-1 gap-1">
              {BOOKMARKS.map((link) => <LinkCard key={link.name} link={link} />)}
            </div>
          </div>
        </div>

        {/* Center: RSS */}
        <div className="lg:col-span-6 space-y-4">
          <RSSFeed />

          {/* Media Links */}
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <SectionHeader title="Media Stack" icon="%" />
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
              {MEDIA_LINKS.map((link) => (
                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-1.5 py-2 px-1 border border-terminal-gray-light bg-terminal-black hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={link.icon} alt="" width={20} height={20} className="opacity-50 group-hover:opacity-100 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <span className="text-[9px] font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors">{link.name}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Calendar */}
        <div className="lg:col-span-3">
          <Calendar />
        </div>
      </div>

      {/* Media Section */}
      <div className="space-y-6 mb-6">
        <JellyfinSection />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdGuardSection />
          <SeerrSection />
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-4 border-t border-terminal-gray-light">
        <div className="flex items-center justify-between text-[10px] font-mono text-terminal-green-dim/30">
          <span>fs0ciety.org</span>
          <span>
            <a href="https://fs0ciety.org/blog" className="hover:text-terminal-green transition-colors">blog</a>
            {" / "}
            <a href="https://fs0ciety.org/blog/pgp" className="hover:text-terminal-green transition-colors">pgp</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
