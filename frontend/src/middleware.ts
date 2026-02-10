import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing middleware for fs0ciety.org:
 *   blog.fs0ciety.org  → /blog
 *   dash.fs0ciety.org  → /dashboard
 *   fs0ciety.org       → / (no rewrite)
 *
 * Also injects security headers on every response.
 */

const SUBDOMAIN_MAP: Record<string, string> = {
  blog: "/blog",
  dash: "/dashboard",
};

/** Security headers applied to every response. */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-XSS-Protection": "0",
  "Content-Security-Policy":
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'",
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

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
        return applySecurityHeaders(NextResponse.rewrite(url));
      }
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Match all paths except static files and internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
