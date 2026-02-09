"use client";

import { cn } from "@/lib/utils";

interface ServiceStatusProps {
  name: string;
  online: boolean;
  latencyMs?: number | null;
}

export function ServiceStatus({ name, online, latencyMs }: ServiceStatusProps) {
  return (
    <div className="flex items-center justify-between font-mono text-sm py-1">
      <span className="text-terminal-green-dim">{name}</span>
      <div className="flex items-center gap-3">
        {latencyMs != null && (
          <span className="text-xs text-terminal-green opacity-40 tabular-nums">
            {latencyMs}ms
          </span>
        )}
        <span
          className={cn(
            "text-xs font-bold",
            online ? "text-terminal-green" : "text-terminal-red"
          )}
        >
          {online ? "● ONLINE" : "● OFFLINE"}
        </span>
      </div>
    </div>
  );
}
