"use client";

import { useEffect, useState } from "react";

export type BlogTheme = "terminal" | "industrial";

const STORAGE_KEY = "fs0ciety_blog_theme";

export function useTheme(): [BlogTheme, (t: BlogTheme) => void] {
  const [theme, setThemeState] = useState<BlogTheme>("terminal");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as BlogTheme | null;
    if (saved === "industrial") {
      setThemeState("industrial");
      document.documentElement.setAttribute("data-theme", "industrial");
    }
  }, []);

  const setTheme = (t: BlogTheme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.setAttribute("data-theme", t === "industrial" ? "industrial" : "");
  };

  return [theme, setTheme];
}

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "terminal" ? "industrial" : "terminal")}
      className="theme-toggle-btn"
      title={`Switch to ${theme === "terminal" ? "Industrial" : "Terminal"} theme`}
      aria-label="Toggle theme"
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${theme === "industrial" ? "theme-toggle-thumb-on" : ""}`} />
      </span>
      <span className="theme-toggle-label">
        {theme === "terminal" ? "Terminal" : "Industrial"}
      </span>
    </button>
  );
}
