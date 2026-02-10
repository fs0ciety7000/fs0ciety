"use client";

import { subdomainHref } from "@/lib/urls";

export function BlogFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-terminal-gray-light mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-terminal-green-dim opacity-60">
          <div className="flex items-center gap-2">
            <span className="text-terminal-green">$</span>
            <span>fs0ciety &copy; {year}</span>
            <span className="text-terminal-gray-light">|</span>
            <span>&quot;Control is an illusion.&quot;</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={subdomainHref("/")}
              className="hover:text-terminal-green transition-colors"
            >
              terminal
            </a>
            <a
              href={subdomainHref("/dashboard")}
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
          </div>
        </div>
      </div>
    </footer>
  );
}
