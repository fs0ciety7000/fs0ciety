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

  // Extract subdomain: "blog.fs0ciety.org" → "blog"
  const subdomain = host.replace(`.${domain}`, "").replace(`:${new URL(request.url).port}`, "");

  // Only rewrite if we have a known subdomain and host isn't the bare domain
  if (subdomain !== host && subdomain !== domain && SUBDOMAIN_MAP[subdomain]) {
    const prefix = SUBDOMAIN_MAP[subdomain];
    const { pathname } = request.nextUrl;

    // Don't rewrite if already prefixed, or if it's an internal path (_next, api)
    if (
      !pathname.startsWith(prefix) &&
      !pathname.startsWith("/_next") &&
      !pathname.startsWith("/api")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `${prefix}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
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
