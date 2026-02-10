import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing middleware for fs0ciety.org:
 *   blog.fs0ciety.org  → /blog
 *   dash.fs0ciety.org  → /dashboard
 *   fs0ciety.org       → / (no rewrite)
 */

const SUBDOMAIN_MAP: Record<string, string> = {
  blog: "/blog",
  dash: "/dashboard",
};

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";

  // Strip port if present (e.g. "blog.fs0ciety.org:3000" → "blog.fs0ciety.org")
  const hostWithoutPort = host.split(":")[0];
  const domainWithoutPort = domain.split(":")[0];

  // Extract subdomain: "blog.fs0ciety.org" → "blog"
  // Only match if host ends with the domain and has a prefix
  if (
    hostWithoutPort !== domainWithoutPort &&
    hostWithoutPort.endsWith(`.${domainWithoutPort}`)
  ) {
    const subdomain = hostWithoutPort.slice(
      0,
      hostWithoutPort.length - domainWithoutPort.length - 1
    );

    const prefix = SUBDOMAIN_MAP[subdomain];
    if (prefix) {
      const { pathname } = request.nextUrl;

      // Don't rewrite if already prefixed, internal path, or a static file
      const isStaticFile = /\.\w{2,5}$/.test(pathname);
      if (
        !pathname.startsWith(prefix) &&
        !pathname.startsWith("/_next") &&
        !pathname.startsWith("/api") &&
        !isStaticFile
      ) {
        const url = request.nextUrl.clone();
        url.pathname = `${prefix}${pathname === "/" ? "" : pathname}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
