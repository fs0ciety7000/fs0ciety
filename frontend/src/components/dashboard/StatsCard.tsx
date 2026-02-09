"use client";

import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: "green" | "red" | "amber" | "cyan";
}

const VARIANT_STYLES = {
  green: "border-terminal-green/30 text-terminal-green",
  red: "border-terminal-red/30 text-terminal-red",
  amber: "border-terminal-amber/30 text-terminal-amber",
  cyan: "border-terminal-cyan/30 text-terminal-cyan",
};

export function StatsCard({
  label,
  value,
  subtext,
  variant = "green",
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "border bg-terminal-black-light p-4 font-mono",
        VARIANT_STYLES[variant]
      )}
    >
      <div className="text-xs opacity-60 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {subtext && (
        <div className="text-xs opacity-40 mt-1">{subtext}</div>
      )}
    </div>
  );
}
