import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  output: "standalone",
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    // Server-side rewrite: proxy /api calls to the backend service.
    // In Docker, INTERNAL_API_URL=http://backend:3001 (container network).
    // In dev, falls back to localhost.
    const backendUrl =
      process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/ws",
        destination: `${backendUrl}/ws`,
      },
      // Honeypot traps — proxy to backend so intruder hits get logged
      {
        source: "/.env",
        destination: `${backendUrl}/.env`,
      },
      {
        source: "/.git/config",
        destination: `${backendUrl}/.git/config`,
      },
      {
        source: "/wp-admin",
        destination: `${backendUrl}/wp-admin`,
      },
      {
        source: "/wp-login.php",
        destination: `${backendUrl}/wp-login.php`,
      },
      {
        source: "/admin/config",
        destination: `${backendUrl}/admin/config`,
      },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
