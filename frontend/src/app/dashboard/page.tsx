"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import { GlitchText } from "@/components/effects/GlitchText";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ASCIIChart } from "@/components/dashboard/ASCIIChart";
import { ServiceStatus } from "@/components/dashboard/ServiceStatus";
import { formatBytes, formatSpeed } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { connect, connected, stats } = useWebSocket();
  const speedHistory = useRef<number[]>([]);

  useEffect(() => {
    connect();
  }, [connect]);

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

      {/* Charts + Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
    </div>
  );
}
