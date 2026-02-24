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
  const isIndustrial = theme === "industrial";

  return (
    <button
      onClick={() => setTheme(isIndustrial ? "terminal" : "industrial")}
      className="spectr-theme-toggle"
      title={`Switch to ${isIndustrial ? "Blacksite" : "Clearance"} mode`}
      aria-label="Toggle theme"
    >
      <span className="spectr-theme-track">
        <span className={`spectr-theme-thumb ${isIndustrial ? "spectr-theme-thumb-on" : ""}`} />
      </span>
      <span className="spectr-theme-label">
        {isIndustrial ? "Clearance" : "Blacksite"}
      </span>
    </button>
  );
}
