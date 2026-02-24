"use client";

import { useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Client-side blog shell that handles theme initialization
 * and renders the theme toggle button.
 */
export function BlogShell({ children }: { children: React.ReactNode }) {
  // Initialize theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("fs0ciety_blog_theme");
    if (saved === "industrial") {
      document.documentElement.setAttribute("data-theme", "industrial");
    }
  }, []);

  return (
    <div className="blog-shell min-h-screen flex flex-col">
      <ThemeToggle />
      {children}
    </div>
  );
}
