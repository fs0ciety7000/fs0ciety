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
  color?: string;
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
];

const USUAL_LINKS: AppLink[] = [
  { name: "Protonmail", url: "https://mail.proton.me", icon: ICON("proton-mail") },
  { name: "Gmail", url: "https://mail.google.com", icon: ICON("gmail") },
  { name: "Google Drive", url: "https://drive.google.com", icon: ICON("google-drive") },
  { name: "Proton Drive", url: "https://drive.proton.me", icon: ICON("proton-drive") },
  { name: "Reddit", url: "https://reddit.com", icon: ICON("reddit") },
  { name: "X", url: "https://x.com", icon: ICON("x") },
];

const MEDIA_LINKS: AppLink[] = [
  { name: "Zucchini", url: "https://whatbox.ca/manage", icon: ICON("whatbox"), color: "#FFB000" },
  { name: "Jellyfin", url: "https://jellyfin.cinenode.org/web/", icon: ICON("jellyfin"), color: "#00D4FF" },
  { name: "Prowlarr", url: "https://prowlarr.cinenode.org/", icon: ICON("prowlarr"), color: "#FFB000" },
  { name: "Radarr", url: "https://radarr.cinenode.org/", icon: ICON("radarr"), color: "#FFB000" },
  { name: "Sonarr", url: "https://sonarr.cinenode.org/", icon: ICON("sonarr"), color: "#00D4FF" },
  { name: "Qbit", url: "https://qbittorrent.cinenode.org/", icon: ICON("qbittorrent"), color: "#00FF41" },
  { name: "SAB", url: "https://sabnzbd.cinenode.org/", icon: ICON("sabnzbd"), color: "#FFB000" },
  { name: "Seerr", url: "https://requests.cinenode.org/", icon: ICON("jellyseerr"), color: "#9B30FF" },
];

// ── RSS types ───────────────────────────────────────────────

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

// ── Calendar types ──────────────────────────────────────────

interface CalEvent {
  summary: string;
  dtstart: string;
  dtend: string;
  description?: string;
  location?: string;
}

// ── Source colors ────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  Korben: "text-terminal-amber",
  "The Verge": "text-terminal-cyan",
  Wired: "text-terminal-purple",
  TechCrunch: "text-terminal-green",
  fs0ciety: "text-terminal-red",
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
  // All-day event: no time component
  if (!dtstart.includes("T")) return "All day";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

// ── Components ──────────────────────────────────────────────

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
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <span className="text-xs font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors truncate">
        {link.name}
      </span>
      <span className="ml-auto text-terminal-green-dim/30 text-[10px] group-hover:text-terminal-green/50 transition-colors">
        &rarr;
      </span>
    </a>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-terminal-gray-light">
      <span className="text-terminal-amber text-xs">{icon}</span>
      <h2 className="text-xs font-mono text-terminal-green uppercase tracking-wider font-bold">
        {title}
      </h2>
    </div>
  );
}

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
        <div className="text-xs font-mono text-terminal-green-dim animate-pulse py-4">
          Fetching feeds...
        </div>
      ) : items.length === 0 ? (
        <div className="text-xs font-mono text-terminal-green-dim/50 py-4">
          No feed items available.
        </div>
      ) : (
        <div className="space-y-0.5 max-h-[420px] overflow-y-auto">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 py-1.5 px-1 hover:bg-terminal-green/5 transition-colors rounded-sm"
            >
              <span
                className={`text-[10px] font-mono shrink-0 w-16 uppercase font-bold ${SOURCE_COLORS[item.source] || "text-terminal-green-dim"}`}
              >
                {item.source}
              </span>
              <span className="text-xs font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors flex-1 min-w-0 line-clamp-2">
                {item.title}
              </span>
              {item.pubDate && (
                <span className="text-[10px] font-mono text-terminal-green-dim/40 shrink-0 tabular-nums">
                  {timeAgo(item.pubDate)}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

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

  // Days with events for the current view month
  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    for (const ev of events) {
      const d = new Date(ev.dtstart);
      dates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    return dates;
  }, [events]);

  // Events for selected day
  const dayEvents = useMemo(() => {
    return events.filter((ev) => isSameDay(new Date(ev.dtstart), selectedDate));
  }, [events, selectedDate]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    // Adjust for Monday start
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewMonth]);

  const prevMonth = useCallback(() => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const today = new Date();
  const monthLabel = viewMonth.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
      <SectionHeader title="Calendar" icon="#" />

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green px-2 py-1 transition-colors"
        >
          &laquo;
        </button>
        <span className="text-xs font-mono text-terminal-green capitalize">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green px-2 py-1 transition-colors"
        >
          &raquo;
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-mono text-terminal-green-dim/50 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-4">
        {calendarDays.map((day, i) => {
          if (day === null) {
            return <div key={`e-${i}`} className="h-7" />;
          }

          const dateObj = new Date(
            viewMonth.getFullYear(),
            viewMonth.getMonth(),
            day
          );
          const isToday = isSameDay(dateObj, today);
          const isSelected = isSameDay(dateObj, selectedDate);
          const hasEvent = eventDates.has(
            `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`
          );

          return (
            <button
              key={`d-${day}`}
              onClick={() => setSelectedDate(dateObj)}
              className={`h-7 text-[11px] font-mono transition-colors relative ${
                isSelected
                  ? "bg-terminal-green text-terminal-black font-bold"
                  : isToday
                    ? "text-terminal-green font-bold border border-terminal-green/40"
                    : "text-terminal-green-dim hover:bg-terminal-green/10"
              }`}
            >
              {day}
              {hasEvent && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-terminal-amber" />
              )}
            </button>
          );
        })}
      </div>

      {/* Events for selected day */}
      <div className="border-t border-terminal-gray-light pt-3">
        <div className="text-[10px] font-mono text-terminal-green-dim/50 mb-2 uppercase tracking-wider">
          {selectedDate.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>

        {loading ? (
          <div className="text-xs font-mono text-terminal-green-dim animate-pulse">
            Loading...
          </div>
        ) : dayEvents.length === 0 ? (
          <div className="text-xs font-mono text-terminal-green-dim/30 py-2">
            No events
          </div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((ev, i) => (
              <div
                key={i}
                className="flex items-start gap-2 py-1.5 px-2 border-l-2 border-terminal-amber bg-terminal-amber/5"
              >
                <span className="text-[10px] font-mono text-terminal-amber shrink-0 tabular-nums mt-0.5">
                  {formatEventTime(ev.dtstart)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-terminal-green truncate">
                    {ev.summary}
                  </div>
                  {ev.location && (
                    <div className="text-[10px] font-mono text-terminal-green-dim/50 truncate">
                      {ev.location}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
        now.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }) +
          " — " +
          now.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
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
          <img
            src="/logo.svg"
            alt="fs0ciety"
            width={32}
            height={32}
            className="opacity-70"
          />
          <div>
            <h1 className="text-lg md:text-xl font-bold text-terminal-green">
              fs0ciety<span className="text-terminal-green-dim">.start</span>
            </h1>
            <div className="text-[10px] text-terminal-green-dim/50 capitalize">
              {time}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="text-xs text-terminal-green-dim hover:text-terminal-green transition-colors border border-terminal-green/20 px-3 py-1"
          >
            terminal
          </a>
          <a
            href="/dashboard"
            className="text-xs text-terminal-cyan hover:text-terminal-green transition-colors border border-terminal-cyan/20 px-3 py-1"
          >
            seedbox
          </a>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Left column: Links */}
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          {/* Personal Services */}
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <SectionHeader title="Self-Hosted" icon=">" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-1">
              {PERSONAL_LINKS.map((link) => (
                <LinkCard key={link.name} link={link} />
              ))}
            </div>
          </div>

          {/* Usual Links */}
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <SectionHeader title="Bookmarks" icon="~" />
            <div className="grid grid-cols-2 gap-1">
              {USUAL_LINKS.map((link) => (
                <LinkCard key={link.name} link={link} />
              ))}
            </div>
          </div>
        </div>

        {/* Center column: RSS + Media */}
        <div className="lg:col-span-5 space-y-4 md:space-y-6">
          {/* RSS Feed */}
          <RSSFeed />

          {/* Media Links */}
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <SectionHeader title="Media Stack" icon="%" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {MEDIA_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center gap-2 py-3 px-2 border border-terminal-gray-light bg-terminal-black hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={link.icon}
                    alt=""
                    width={24}
                    height={24}
                    className="opacity-50 group-hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="text-[10px] font-mono text-terminal-green-dim group-hover:text-terminal-green transition-colors">
                    {link.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Calendar */}
        <div className="lg:col-span-3">
          <Calendar />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-terminal-gray-light">
        <div className="flex items-center justify-between text-[10px] font-mono text-terminal-green-dim/30">
          <span>fs0ciety.org</span>
          <span>
            <a
              href="https://fs0ciety.org/blog"
              className="hover:text-terminal-green transition-colors"
            >
              blog
            </a>
            {" / "}
            <a
              href="https://fs0ciety.org/blog/pgp"
              className="hover:text-terminal-green transition-colors"
            >
              pgp
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
