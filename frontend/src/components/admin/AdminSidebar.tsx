"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "~" },
  { href: "/admin/posts", label: "Posts", icon: ">" },
  { href: "/admin/posts/new", label: "New Post", icon: "+" },
  { href: "/admin/posts/upload", label: "Upload MDX", icon: "^" },
  { href: "/admin/users", label: "Users", icon: "@" },
  { href: "/admin/audit", label: "Audit Log", icon: "!" },
  { href: "/admin/settings", label: "Settings", icon: "*" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r border-terminal-gray-light bg-terminal-black-light flex flex-col">
      {/* Brand */}
      <div className="p-6 border-b border-terminal-gray-light">
        <Link href="/admin" className="flex items-center gap-3 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt=""
            width={32}
            height={32}
            className="opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <div>
            <div className="text-terminal-green font-mono font-bold text-lg tracking-tight group-hover:text-terminal-green-dim transition-colors">
              fs0ciety
            </div>
            <div className="text-xs font-mono text-terminal-green-dim opacity-50">
              //admin panel
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-mono transition-colors",
                isActive
                  ? "text-terminal-green bg-terminal-green/5 border-r-2 border-terminal-green"
                  : "text-terminal-green-dim hover:text-terminal-green hover:bg-terminal-green/5"
              )}
            >
              <span className="text-terminal-green opacity-60 w-4 text-center">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-terminal-gray-light space-y-2">
        <Link
          href="/blog"
          className="block text-xs font-mono text-terminal-green-dim hover:text-terminal-cyan transition-colors"
        >
          View Blog &rarr;
        </Link>
        <Link
          href="/"
          className="block text-xs font-mono text-terminal-green-dim hover:text-terminal-cyan transition-colors"
        >
          $ Terminal
        </Link>
        <Link
          href="/profile"
          className="block text-xs font-mono text-terminal-green-dim hover:text-terminal-cyan transition-colors"
        >
          ~ Profile
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem("fs0ciety_token");
            localStorage.removeItem("fs0ciety_user");
            window.location.href = "/login";
          }}
          className="block text-xs font-mono text-terminal-red-dim hover:text-terminal-red transition-colors mt-4"
        >
          logout
        </button>
      </div>
    </aside>
  );
}
