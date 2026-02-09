"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SeedboxStats } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

/** Hook for real-time seedbox stats via WebSocket. */
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<SeedboxStats | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "stats_update" && msg.data) {
          setStats({
            downloadSpeed: msg.data.download_speed,
            uploadSpeed: msg.data.upload_speed,
            diskUsed: msg.data.disk_used,
            diskTotal: msg.data.disk_total,
            activeTorrents: msg.data.active_torrents,
            seedingTorrents: msg.data.seeding_torrents,
          });
        }
      } catch {
        // Ignore malformed messages.
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3 seconds.
      setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect, connected, stats };
}
