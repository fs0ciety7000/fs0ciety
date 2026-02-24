"use client";

import { motion } from "framer-motion";

interface TagFilterProps {
  tags: string[];
  active: string | null;
  onChange: (tag: string | null) => void;
}

export function TagFilter({ tags, active, onChange }: TagFilterProps) {
  return (
    <motion.div
      className="flex flex-wrap gap-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <button
        onClick={() => onChange(null)}
        className={`spectr-tag ${active === null ? "spectr-tag-active" : ""}`}
      >
        all
      </button>
      {tags.map((tag, i) => (
        <motion.button
          key={tag}
          onClick={() => onChange(active === tag ? null : tag)}
          className={`spectr-tag ${active === tag ? "spectr-tag-active" : ""}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.05 * i }}
        >
          #{tag}
        </motion.button>
      ))}
    </motion.div>
  );
}
