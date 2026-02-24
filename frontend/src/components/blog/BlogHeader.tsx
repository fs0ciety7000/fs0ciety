"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSubdomainHrefs } from "@/lib/urls";
import { getAuthUser } from "@/lib/auth-cookie";

export function BlogHeader() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const hrefs = useSubdomainHrefs({
    terminal: "/",
    profile: "/profile",
    admin: "/admin",
  });

  useEffect(() => {
    const user = getAuthUser();
    if (user) {
      setIsLoggedIn(true);
      setIsAdmin(user.role === "admin");
    }
  }, []);

  return (
    <>
      {/* Classification bar */}
      <div className="spectr-classification spectr-classification-dark">
        <span className="spectr-pulse" />
        <span>Secure Channel</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span style={{ opacity: 0.4 }}>UNCLASSIFIED // FOUO</span>
        <span style={{ opacity: 0.3 }}>|</span>
        <span style={{ opacity: 0.4 }}>
          {new Date().toISOString().split("T")[0]}
        </span>
      </div>

      {/* Main header */}
      <header className="spectr-header-glass border-b border-[--spectr-border-primary] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/blog" className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="fs0ciety"
              width={28}
              height={28}
              className="opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <motion.span
              className="font-mono font-bold text-xl tracking-tight"
              style={{ color: "var(--spectr-accent-primary)" }}
              whileHover={{ letterSpacing: "0.05em" }}
              transition={{ duration: 0.2 }}
            >
              fs0ciety
            </motion.span>
            <span
              className="hidden sm:inline text-xs font-mono"
              style={{ color: "var(--spectr-text-muted)" }}
            >
              //blog
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-5">
            <Link href="/blog" className="spectr-nav-link">
              posts
            </Link>
            <a href={hrefs.terminal} className="spectr-nav-link">
              <span style={{ color: "var(--spectr-accent-primary)", opacity: 0.5, marginRight: "0.25rem" }}>$</span>
              terminal
            </a>
            {isLoggedIn && (
              <a href={hrefs.profile} className="spectr-nav-link">
                <span style={{ color: "var(--spectr-accent-secondary)", opacity: 0.5, marginRight: "0.25rem" }}>~</span>
                profile
              </a>
            )}
            {isAdmin && (
              <a href={hrefs.admin} className="spectr-nav-link">
                <span style={{ color: "var(--spectr-accent-tertiary)", opacity: 0.5, marginRight: "0.25rem" }}>@</span>
                admin
              </a>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
