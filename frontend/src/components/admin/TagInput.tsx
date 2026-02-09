"use client";

import { useState, type KeyboardEvent } from "react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="border border-terminal-gray-light bg-terminal-black-light px-3 py-2 flex flex-wrap gap-2 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 border border-terminal-green/20 text-terminal-green"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-terminal-red-dim hover:text-terminal-red ml-1"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? "Add tags (press Enter)" : ""}
        className="flex-1 min-w-[120px] bg-transparent text-terminal-green font-mono text-sm outline-none placeholder:text-terminal-green-dim/30"
      />
    </div>
  );
}
