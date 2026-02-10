"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CipherText } from "@/components/blog/CipherText";

interface IntruderHit {
  anonymized_ip: string;
  user_agent: string;
  path: string;
  timestamp: string;
}

export default function IntrudersPage() {
  const [hits, setHits] = useState<IntruderHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/honeypot/intruders")
      .then((r) => r.json())
      .then((data) => setHits(data.intruders ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Back link */}
      <Link
        href="/blog"
        className="text-xs font-mono text-terminal-green-dim hover:text-terminal-green transition-colors inline-block mb-8"
      >
        &larr; cd /blog
      </Link>

      <h1 className="text-2xl sm:text-3xl font-mono font-bold text-terminal-red mb-2">
        <CipherText text="INTRUDERS DETECTED" speed={25} cycles={4} className="text-terminal-red" />
      </h1>
      <p className="text-sm text-[#a3a3a3] font-sans mb-2">
        Real-time honeypot monitoring. These IPs probed common exploit paths on this server.
      </p>
      <p className="text-xs font-mono text-terminal-amber/60 mb-8">
        IPs are anonymized. This is a public transparency feed.
      </p>

      {loading ? (
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
          $ tail -f /var/log/honeypot.log
        </div>
      ) : hits.length === 0 ? (
        <div className="border border-terminal-green/20 bg-terminal-black-light p-6 font-mono text-sm text-terminal-green-dim text-center">
          No intrusion attempts detected yet. The honeypot is listening...
        </div>
      ) : (
        <div className="border border-terminal-red/20 bg-terminal-black-light font-mono text-xs overflow-x-auto">
          {/* Header */}
          <div className="grid grid-cols-[140px_140px_200px_1fr] gap-2 px-4 py-2 border-b border-terminal-gray-light text-terminal-red/50 uppercase tracking-wider text-[10px]">
            <span>timestamp</span>
            <span>ip (anonymized)</span>
            <span>path probed</span>
            <span>user-agent</span>
          </div>

          {/* Rows */}
          {hits.map((hit, i) => {
            const ts = new Date(hit.timestamp);
            const timeStr = isNaN(ts.getTime())
              ? hit.timestamp
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
                className="grid grid-cols-[140px_140px_200px_1fr] gap-2 px-4 py-2 border-b border-terminal-gray/30 hover:bg-terminal-red/5 transition-colors"
              >
                <span className="text-terminal-green-dim">{timeStr}</span>
                <span className="text-terminal-amber">{hit.anonymized_ip}</span>
                <span className="text-terminal-red">{hit.path}</span>
                <span className="text-[#a3a3a3] truncate opacity-50" title={hit.user_agent}>
                  {hit.user_agent}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom note */}
      <div className="mt-6 text-[10px] font-mono text-terminal-green-dim/30 text-center">
        Honeypot paths: /admin/config, /.env, /wp-admin, /wp-login.php, /.git/config
      </div>
    </div>
  );
}
