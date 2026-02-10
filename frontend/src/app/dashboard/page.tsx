"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { GlitchText } from "@/components/effects/GlitchText";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ASCIIChart } from "@/components/dashboard/ASCIIChart";
import { ServiceStatus } from "@/components/dashboard/ServiceStatus";
import { formatBytes, formatSpeed } from "@/lib/utils";

interface MediaData {
  plex: {
    now_playing: Array<{
      title: string;
      parentTitle?: string;
      grandparentTitle?: string;
      type: string;
      user: string;
      player: string;
      state: string;
      progress: number;
      thumb?: string;
    }>;
    recently_added: Array<{
      title: string;
      type: string;
      year?: number;
      addedAt?: number;
      thumb?: string;
    }>;
  };
  sonarr: {
    series_count: number;
    recent: Array<{
      seriesTitle: string;
      episodeTitle: string;
      season: number;
      episode: number;
      quality: string;
      date: string;
      eventType: string;
    }>;
  };
  radarr: {
    movie_count: number;
    recent: Array<{
      movieTitle: string;
      quality: string;
      date: string;
      eventType: string;
    }>;
  };
}

function timeAgo(dateStr: string | number): string {
  const date = typeof dateStr === "number"
    ? new Date(dateStr * 1000) // Unix timestamp
    : new Date(dateStr);
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function eventLabel(type: string): string {
  switch (type) {
    case "grabbed": return "GRAB";
    case "downloadFolderImported": return "DL";
    case "downloadFailed": return "FAIL";
    case "episodeFileDeleted":
    case "movieFileDeleted": return "DEL";
    case "episodeFileRenamed":
    case "movieFileRenamed": return "REN";
    default: return type?.toUpperCase()?.slice(0, 4) ?? "?";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { connect, connected, stats } = useWebSocket();
  const speedHistory = useRef<number[]>([]);
  const [media, setMedia] = useState<MediaData | null>(null);

  useEffect(() => {
    connect();
  }, [connect]);

  // Fetch media data on mount and every 30s.
  useEffect(() => {
    let active = true;
    async function fetchMedia() {
      try {
        const res = await fetch("/api/dashboard/media");
        if (res.ok && active) {
          setMedia(await res.json());
        }
      } catch { /* ignore */ }
    }
    fetchMedia();
    const interval = setInterval(fetchMedia, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Build speed history from real data.
  if (stats) {
    const mbps = Math.round(stats.downloadSpeed / 1_000_000);
    speedHistory.current = [...speedHistory.current.slice(-23), mbps];
  }

  const svc = stats?.services;

  return (
    <div className="min-h-screen bg-terminal-black p-4 md:p-8 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-terminal-gray-light">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="fs0ciety"
            width={40}
            height={40}
            className="opacity-70 hover:opacity-100 transition-opacity"
          />
          <div>
            <GlitchText
              text="COMMAND CENTER"
              className="text-2xl md:text-3xl"
              intensity={1}
              hoverOnly
            />
            <div className="text-xs text-terminal-green-dim opacity-50 mt-1">
              Seedbox Dashboard — Real-time Monitoring
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`text-xs ${connected ? "text-terminal-green" : "text-terminal-red"}`}
          >
            {connected ? "● LIVE" : "● DISCONNECTED"}
          </span>
          <button
            onClick={() => router.push("/")}
            className="text-xs text-terminal-green-dim hover:text-terminal-green transition-colors border border-terminal-green/20 px-3 py-1"
          >
            ← terminal
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label="Download"
          value={stats ? formatSpeed(stats.downloadSpeed) : "—"}
          variant="green"
        />
        <StatsCard
          label="Upload"
          value={stats ? formatSpeed(stats.uploadSpeed) : "—"}
          variant="cyan"
        />
        <StatsCard
          label="Disk Usage"
          value={
            stats && stats.diskTotal > 0
              ? `${formatBytes(stats.diskUsed)} / ${formatBytes(stats.diskTotal)}`
              : "—"
          }
          subtext={
            stats && stats.diskTotal > 0
              ? `${((stats.diskUsed / stats.diskTotal) * 100).toFixed(1)}% used`
              : undefined
          }
          variant="amber"
        />
        <StatsCard
          label="Torrents"
          value={
            stats
              ? `${stats.activeTorrents} active / ${stats.seedingTorrents} seeding`
              : "—"
          }
          variant="green"
        />
      </div>

      {/* Library counts */}
      {media && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label="Sonarr Series"
            value={media.sonarr.series_count.toString()}
            variant="cyan"
          />
          <StatsCard
            label="Radarr Movies"
            value={media.radarr.movie_count.toString()}
            variant="amber"
          />
          <StatsCard
            label="Plex Playing"
            value={media.plex.now_playing.length.toString()}
            variant="green"
          />
          <StatsCard
            label="Recently Added"
            value={media.plex.recently_added.length.toString()}
            variant="cyan"
          />
        </div>
      )}

      {/* Charts + Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Speed Chart */}
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
          <h3 className="text-terminal-amber text-xs uppercase tracking-wider mb-3">
            Download Speed — Live
          </h3>
          <ASCIIChart
            data={speedHistory.current.length > 1 ? speedHistory.current : [0]}
            height={8}
            label=""
          />
        </div>

        {/* Service Status */}
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
          <h3 className="text-terminal-amber text-xs uppercase tracking-wider mb-3">
            Service Health
          </h3>
          <div className="space-y-1">
            <ServiceStatus
              name="Backend API"
              online={connected}
              latencyMs={connected ? 1 : null}
            />
            <ServiceStatus
              name="Plex"
              online={svc?.plex?.online ?? false}
              latencyMs={svc?.plex?.latency_ms}
            />
            <ServiceStatus
              name="Sonarr"
              online={svc?.sonarr?.online ?? false}
              latencyMs={svc?.sonarr?.latency_ms}
            />
            <ServiceStatus
              name="Radarr"
              online={svc?.radarr?.online ?? false}
              latencyMs={svc?.radarr?.latency_ms}
            />
            <ServiceStatus
              name="qBittorrent"
              online={svc?.qbittorrent?.online ?? false}
              latencyMs={svc?.qbittorrent?.latency_ms}
            />
          </div>
        </div>
      </div>

      {/* Plex Now Playing */}
      {media && media.plex.now_playing.length > 0 && (
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4 mb-8">
          <h3 className="text-terminal-amber text-xs uppercase tracking-wider mb-3">
            Plex — Now Playing
          </h3>
          <div className="space-y-3">
            {media.plex.now_playing.map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {s.thumb && (
                  <img
                    src={s.thumb}
                    alt=""
                    className="w-10 h-14 object-cover shrink-0 border border-terminal-green/20"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-terminal-green truncate">
                    {s.grandparentTitle ? `${s.grandparentTitle} — ` : ""}
                    {s.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-terminal-green-dim text-xs">{s.user}</span>
                    <span className="text-terminal-cyan text-xs">{s.progress}%</span>
                    <span className={`text-xs ${s.state === "playing" ? "text-terminal-green" : "text-terminal-amber"}`}>
                      {s.state === "playing" ? "▶" : "⏸"}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-0.5 bg-terminal-green/10 mt-1">
                    <div
                      className="h-full bg-terminal-green/60"
                      style={{ width: `${s.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plex Recently Added */}
      {media && media.plex.recently_added.length > 0 && (
        <div className="border border-terminal-green/20 bg-terminal-black-light p-4 mb-8">
          <h3 className="text-terminal-amber text-xs uppercase tracking-wider mb-3">
            Plex — Recently Added
          </h3>
          <div className="space-y-2">
            {media.plex.recently_added.map((m, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                {m.thumb && (
                  <img
                    src={m.thumb}
                    alt=""
                    className="w-8 h-12 object-cover shrink-0 border border-terminal-green/20"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-terminal-green truncate block">{m.title}</span>
                </div>
                <div className="flex items-center gap-3 ml-2 shrink-0">
                  <span className="text-terminal-green-dim text-xs capitalize">{m.type}</span>
                  {m.addedAt && (
                    <span className="text-terminal-green-dim text-xs opacity-50">
                      {timeAgo(m.addedAt)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sonarr + Radarr Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Sonarr */}
        {media && media.sonarr.recent.length > 0 && (
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <h3 className="text-terminal-amber text-xs uppercase tracking-wider mb-3">
              Sonarr — Recent Activity
            </h3>
            <div className="space-y-1">
              {media.sonarr.recent.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-terminal-cyan shrink-0 w-10">
                    [{eventLabel(r.eventType)}]
                  </span>
                  <span className="text-terminal-green flex-1 min-w-0 truncate">
                    {r.seriesTitle} S{String(r.season).padStart(2, "0")}E{String(r.episode).padStart(2, "0")}
                  </span>
                  <span className="text-terminal-green-dim shrink-0">{r.quality}</span>
                  <span className="text-terminal-green-dim opacity-50 shrink-0">
                    {timeAgo(r.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Radarr */}
        {media && media.radarr.recent.length > 0 && (
          <div className="border border-terminal-green/20 bg-terminal-black-light p-4">
            <h3 className="text-terminal-amber text-xs uppercase tracking-wider mb-3">
              Radarr — Recent Activity
            </h3>
            <div className="space-y-1">
              {media.radarr.recent.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-terminal-cyan shrink-0 w-10">
                    [{eventLabel(r.eventType)}]
                  </span>
                  <span className="text-terminal-green flex-1 min-w-0 truncate">
                    {r.movieTitle}
                  </span>
                  <span className="text-terminal-green-dim shrink-0">{r.quality}</span>
                  <span className="text-terminal-green-dim opacity-50 shrink-0">
                    {timeAgo(r.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
