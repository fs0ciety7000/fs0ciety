"use client";

import { useEffect, useState } from "react";
import { useSubdomainHrefs } from "@/lib/urls";

const FOOTER_QUOTES = [
  "Control is an illusion.",
  "The quieter you become, the more you can hear.",
  "People always make the best exploits.",
  "There is no cloud, it's just someone else's computer.",
  "We are fsociety. We are finally free.",
  "Privacy is not for sale.",
  "chmod 777 your mind.",
  "In a world of locked rooms, the man with the key is king.",
];

export function BlogFooter() {
  const year = new Date().getFullYear();
  const [quote, setQuote] = useState(FOOTER_QUOTES[0]);

  useEffect(() => {
    setQuote(FOOTER_QUOTES[Math.floor(Math.random() * FOOTER_QUOTES.length)]);
  }, []);

  const hrefs = useSubdomainHrefs({
    terminal: "/",
    dashboard: "/dashboard",
  });

  return (
    <footer className="border-t border-terminal-gray-light mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-terminal-green-dim opacity-60">
          <div className="flex items-center gap-2">
            <span className="text-terminal-green">$</span>
            <span>fs0ciety &copy; {year}</span>
            <span className="text-terminal-gray-light">|</span>
            <span>&quot;{quote}&quot;</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={hrefs.terminal}
              className="hover:text-terminal-green transition-colors"
            >
              terminal
            </a>
            <a
              href={hrefs.dashboard}
              className="hover:text-terminal-green transition-colors"
            >
              dashboard
            </a>
            <a
              href="/blog/pgp"
              className="hover:text-terminal-green transition-colors flex items-center gap-1"
            >
              <span className="text-terminal-green opacity-50">#</span>
              pgp
            </a>
            <a
              href="/blog/rss"
              className="hover:text-terminal-green transition-colors flex items-center gap-1"
            >
              <span className="text-terminal-green opacity-50">#</span>
              rss
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
