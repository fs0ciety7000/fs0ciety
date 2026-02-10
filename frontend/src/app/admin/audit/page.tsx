"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failed" | "success">("all");

  useEffect(() => {
    const token = localStorage.getItem("fs0ciety_token") || "";
    api.admin
      .auditLogs(token)
      .then((data) => setLogs(data.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter((log) => {
    if (filter === "failed") return !log.success;
    if (filter === "success") return log.success;
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-mono font-bold text-terminal-green mb-1">
          /var/log/auth.log
        </h1>
        <p className="text-sm font-mono text-terminal-green-dim opacity-60">
          Access audit trail &mdash; {logs.length} entries
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "failed", "success"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-mono px-3 py-1.5 border transition-colors ${
              filter === f
                ? "border-terminal-green text-terminal-green bg-terminal-green/10"
                : "border-terminal-gray-light text-terminal-green-dim hover:border-terminal-green/30"
            }`}
          >
            {f === "all" ? `ALL (${logs.length})` : f === "failed" ? `FAILED (${logs.filter((l) => !l.success).length})` : `OK (${logs.filter((l) => l.success).length})`}
          </button>
        ))}
      </div>

      {/* Log entries */}
      {loading ? (
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
          Reading /var/log/auth.log...
        </div>
      ) : filtered.length === 0 ? (
        <div className="font-mono text-terminal-green-dim text-sm">
          No log entries found.
        </div>
      ) : (
        <div className="border border-terminal-gray-light bg-terminal-black-light font-mono text-xs overflow-x-auto">
          {/* Header row */}
          <div className="grid grid-cols-[140px_80px_80px_160px_1fr_100px] gap-2 px-4 py-2 border-b border-terminal-gray-light text-terminal-green-dim uppercase tracking-wider text-[10px]">
            <span>timestamp</span>
            <span>status</span>
            <span>event</span>
            <span>ip</span>
            <span>user-agent</span>
            <span>user</span>
          </div>

          {/* Log rows */}
          {filtered.map((log, i) => {
            const ts = new Date(log.timestamp);
            const timeStr = isNaN(ts.getTime())
              ? log.timestamp
              : ts.toLocaleString("en-US", {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                });

            return (
              <div
                key={i}
                className={`grid grid-cols-[140px_80px_80px_160px_1fr_100px] gap-2 px-4 py-2 border-b border-terminal-gray/50 hover:bg-terminal-green/5 transition-colors ${
                  !log.success ? "text-terminal-red/80" : "text-[#a3a3a3]"
                }`}
              >
                <span className="text-terminal-green-dim">{timeStr}</span>
                <span>
                  {log.success ? (
                    <span className="text-terminal-green">OK</span>
                  ) : (
                    <span className="text-terminal-red font-bold">FAIL</span>
                  )}
                </span>
                <span className="text-terminal-cobalt">{log.event_type}</span>
                <span className="text-terminal-amber">{log.ip}</span>
                <span className="truncate opacity-60" title={log.user_agent}>
                  {log.user_agent}
                </span>
                <span className="text-terminal-cyan">{log.username}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Details note */}
      <div className="mt-6 text-[10px] font-mono text-terminal-green-dim/40">
        <span className="text-terminal-green/40">$</span> tail -f /var/log/auth.log | grep -E &quot;(FAIL|OK)&quot;
      </div>
    </div>
  );
}
