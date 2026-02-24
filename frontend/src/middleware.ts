import { NextRequest, NextResponse } from "next/server";

/**
 * Subdomain routing middleware for fs0ciety.org:
 *   blog.fs0ciety.org  → /blog
 *   dash.fs0ciety.org  → /dash (startpage)
 *   fs0ciety.org       → / (no rewrite)
 *
 * Also injects security headers on every response and protects /dash
 * with HMAC-signed session cookie auth backed by Jellyseerr.
 */

const SUBDOMAIN_MAP: Record<string, string> = {
  blog: "/blog",
  dash: "/dash",
};

// ── Dash auth ────────────────────────────────────────────────

const DASH_SESSION_COOKIE = "dash_session";

/** Paths that bypass auth — login page + auth API routes */
const DASH_PUBLIC_PREFIXES = [
  "/dash/login",
  "/dash/api/auth",
  "/dash/api/spotify/auth",
  "/dash/api/spotify/callback",
];

function isDashPublic(path: string): boolean {
  return DASH_PUBLIC_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix + "?")
  );
}

async function verifyDashSession(token: string): Promise<boolean> {
  const secret = process.env.DASH_SESSION_SECRET || "fs0ciety-dash-secret-key-change-me";
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [userId, ts, sig] = parts;
  const payload = `${userId}.${ts}`;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const expected = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expected)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return expectedSig === sig;
  } catch {
    return false;
  }
}

/** Security headers applied to every response. */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "Referrer-Policy": "strict-origin-when-cross-origin",
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

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";

  // Strip port if present (e.g. "blog.fs0ciety.org:3000" → "blog.fs0ciety.org")
  const hostWithoutPort = host.split(":")[0];
  const domainWithoutPort = domain.split(":")[0];

  const { pathname } = request.nextUrl;
  let effectivePath = pathname;
  let isDashSubdomain = false;
  let shouldRewrite = false;

  // Extract subdomain: "blog.fs0ciety.org" → "blog"
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
      const isStaticFile = /\.\w{2,5}$/.test(pathname);
      if (
        !pathname.startsWith(prefix) &&
        !pathname.startsWith("/_next") &&
        !pathname.startsWith("/api") &&
        !isStaticFile
      ) {
        effectivePath = `${prefix}${pathname === "/" ? "" : pathname}`;
        shouldRewrite = true;
      }
      if (subdomain === "dash") isDashSubdomain = true;
    }
  }

  // ── Dash auth gate ────────────────────────────────────────
  if (effectivePath.startsWith("/dash") && !isDashPublic(effectivePath)) {
    const sessionToken = request.cookies.get(DASH_SESSION_COOKIE)?.value;
    const valid = sessionToken ? await verifyDashSession(sessionToken) : false;
    if (!valid) {
      // On dash.fs0ciety.org, /login will be rewritten to /dash/login by middleware
      const loginPath = isDashSubdomain ? "/login" : "/dash/login";
      const loginUrl = new URL(loginPath, request.url);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  // ── Subdomain rewrite ─────────────────────────────────────
  if (shouldRewrite) {
    const url = request.nextUrl.clone();
    url.pathname = effectivePath;
    return applySecurityHeaders(NextResponse.rewrite(url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Match all paths except static files and internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
