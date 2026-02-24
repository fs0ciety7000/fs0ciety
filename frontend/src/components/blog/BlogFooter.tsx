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

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="spectr-status-dot"
      style={{
        background: ok ? "var(--spectr-accent-primary)" : "var(--spectr-accent-danger)",
        boxShadow: ok ? `0 0 6px var(--spectr-glow-primary)` : "none",
      }}
    />
  );
}

function SecurityBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="spectr-status" style={{ color: "var(--spectr-text-muted)" }}>
      <StatusDot ok={ok} />
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
    <footer className="spectr-footer mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Main row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap spectr-caption" style={{ color: "var(--spectr-text-muted)" }}>
            <span style={{ color: "var(--spectr-accent-primary)" }}>$</span>
            <span>fs0ciety &copy; {year}</span>
            <span style={{ opacity: 0.3 }}>|</span>
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="spectr-footer-link"
            >
              CC BY-NC-SA 4.0
            </a>
            <span style={{ opacity: 0.3 }}>|</span>
            <span style={{ opacity: 0.5, fontStyle: "italic" }}>&ldquo;{quote}&rdquo;</span>
          </div>

          <div className="flex items-center gap-4">
            <a href={hrefs.terminal} className="spectr-footer-link">terminal</a>
            <a href={hrefs.dashboard} className="spectr-footer-link">dashboard</a>
            <a href="/blog/pgp" className="spectr-footer-link">
              <span style={{ color: "var(--spectr-accent-primary)", opacity: 0.5 }}>#</span>
              pgp
            </a>
            <a href="/blog/rss" className="spectr-footer-link">
              <span style={{ color: "var(--spectr-accent-primary)", opacity: 0.5 }}>#</span>
              rss
            </a>
            <a
              href="https://defcon.social/@phant0mhex"
              target="_blank"
              rel="me noopener noreferrer"
              className="spectr-footer-link"
            >
              <span style={{ color: "var(--spectr-accent-primary)", opacity: 0.5 }}>@</span>
              mastodon
            </a>
            <a href="/blog/intruders" className="spectr-footer-link" style={{ color: "var(--spectr-accent-danger)" }}>
              <span style={{ opacity: 0.5 }}>!</span>
              intruders
            </a>
          </div>
        </div>

        {/* Security status bar */}
        <div className="spectr-divider mt-6 mb-4" />
        <div className="flex items-center justify-center gap-6 opacity-40 hover:opacity-70 transition-opacity">
          <SecurityBadge label="SSL" ok={isHttps} />
          <SecurityBadge label="Headers" ok={true} />
          <SecurityBadge label="EXIF-Strip" ok={true} />
          <SecurityBadge label="Tor" ok={true} />
          <SecurityBadge label="HSTS" ok={true} />
        </div>
      </div>
    </footer>
  );
}
