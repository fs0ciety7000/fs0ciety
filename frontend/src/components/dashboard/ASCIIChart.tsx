"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ASCIIChartProps {
  /** Data points (0–100 normalized). */
  data: number[];
  /** Chart height in rows. Default: 8. */
  height?: number;
  /** Chart width in columns. Default: data.length. */
  width?: number;
  label?: string;
  className?: string;
}

const BLOCK_CHARS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

/**
 * ASCIIChart — renders a minimalist bar chart using Unicode block characters.
 * Pure text rendering — no canvas, no SVG. Looks native in a terminal.
 */
export function ASCIIChart({
  data,
  height = 8,
  label,
  className,
}: ASCIIChartProps) {
  const chart = useMemo(() => {
    const max = Math.max(...data, 1);
    const rows: string[] = [];

    for (let row = height; row >= 1; row--) {
      const threshold = (row / height) * max;
      let line = "";
      for (const val of data) {
        if (val >= threshold) {
          line += "█";
        } else if (val >= threshold - (max / height) * 0.5) {
          const frac = ((val - (threshold - max / height)) / (max / height));
          const idx = Math.round(frac * (BLOCK_CHARS.length - 1));
          line += BLOCK_CHARS[Math.max(0, Math.min(idx, BLOCK_CHARS.length - 1))];
        } else {
          line += " ";
        }
      }
      rows.push(line);
    }

    // Bottom axis.
    rows.push("─".repeat(data.length));

    return rows;
  }, [data, height]);

  return (
    <div className={cn("font-mono text-terminal-green text-xs", className)}>
      {label && (
        <div className="text-terminal-amber text-xs mb-1 opacity-60">
          {label}
        </div>
      )}
      <pre className="leading-none">
        {chart.map((row, i) => (
          <div key={i}>{row}</div>
        ))}
      </pre>
    </div>
  );
}
