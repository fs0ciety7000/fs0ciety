"use client";

import { cn } from "@/lib/utils";

interface TagFilterProps {
  tags: string[];
  active: string | null;
  onChange: (tag: string | null) => void;
}

export function TagFilter({ tags, active, onChange }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "text-xs font-mono px-3 py-1 border transition-colors",
          active === null
            ? "border-terminal-green text-terminal-green bg-terminal-green/10"
            : "border-terminal-gray-light text-terminal-green-dim hover:border-terminal-green/40"
        )}
      >
        all
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onChange(active === tag ? null : tag)}
          className={cn(
            "text-xs font-mono px-3 py-1 border transition-colors",
            active === tag
              ? "border-terminal-green text-terminal-green bg-terminal-green/10"
              : "border-terminal-gray-light text-terminal-green-dim hover:border-terminal-green/40"
          )}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
