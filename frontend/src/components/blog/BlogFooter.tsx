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

function SecurityBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="security-badge">
      <span className={`dot ${ok ? "dot-ok" : "dot-err"}`} />
      <span>{label}: {ok ? "OK" : "ERR"}</span>
    </span>
  );
}

export function BlogFooter() {
  const year = new Date().getFullYear();
  const [quote, setQuote] = useState(FOOTER_QUOTES[0]);
  const [isHttps, setIsHttps] = useState(true);

  useEffect(() => {
    setQuote(FOOTER_QUOTES[Math.floor(Math.random() * FOOTER_QUOTES.length)]);
    setIsHttps(window.location.protocol === "https:");
  }, []);

  const hrefs = useSubdomainHrefs({
    terminal: "/",
    dashboard: "/dashboard",
  });

  return (
    <footer className="border-t border-terminal-gray-light mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-terminal-green-dim opacity-60">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-terminal-green">$</span>
            <span>fs0ciety &copy; {year}</span>
            <span className="text-terminal-gray-light">|</span>
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-terminal-green transition-colors"
            >
              CC BY-NC-SA 4.0
            </a>
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
            <a
              href="https://defcon.social/@phant0mhex"
              target="_blank"
              rel="me noopener noreferrer"
              className="hover:text-terminal-green transition-colors flex items-center gap-1"
            >
              <span className="text-terminal-green opacity-50">@</span>
              mastodon
            </a>
            <a
              href="/blog/intruders"
              className="hover:text-terminal-red transition-colors flex items-center gap-1"
            >
              <span className="text-terminal-red opacity-50">!</span>
              intruders
            </a>
          </div>
        </div>

        {/* Security status bar */}
        <div className="flex items-center justify-center gap-4 mt-4 opacity-30 hover:opacity-60 transition-opacity">
          <SecurityBadge label="SSL" ok={isHttps} />
          <SecurityBadge label="Headers" ok={true} />
          <SecurityBadge label="EXIF-Strip" ok={true} />
          <SecurityBadge label="Tor" ok={true} />
        </div>
      </div>
    </footer>
  );
}
