import type { Metadata } from "next";
import "./globals.css";
import { MaintenanceGuard } from "@/components/MaintenanceGuard";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";
const SITE_URL = `https://${DOMAIN}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "fs0ciety — Terminal Blog & Command Center",
    template: "%s — fs0ciety",
  },
  description:
    "Writings on security, systems, infrastructure, and the digital underground. A hacker's terminal blog and seedbox command center.",
  keywords: [
    "security",
    "hacking",
    "infosec",
    "cybersecurity",
    "linux",
    "systems",
    "infrastructure",
    "terminal",
    "blog",
    "seedbox",
    "privacy",
    "opsec",
  ],
  authors: [{ name: "fs0ciety" }],
  creator: "fs0ciety",
  publisher: "fs0ciety",
  icons: [
    { rel: "icon", url: "/icons8-fsociety-mask-color-32.png", sizes: "32x32", type: "image/png" },
    { rel: "icon", url: "/icons8-fsociety-mask-color-16.png", sizes: "16x16", type: "image/png" },
    { rel: "apple-touch-icon", url: "/icons8-fsociety-mask-color-180.png", sizes: "180x180" },
  ],
  openGraph: {
    type: "website",
    siteName: "fs0ciety",
    title: "fs0ciety — Terminal Blog & Command Center",
    description:
      "Writings on security, systems, infrastructure, and the digital underground.",
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/icons8-fsociety-mask-color-512.png",
        width: 512,
        height: 512,
        alt: "fs0ciety",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "fs0ciety — Terminal Blog & Command Center",
    description:
      "Writings on security, systems, infrastructure, and the digital underground.",
    images: ["/icons8-fsociety-mask-color-512.png"],
  },
  alternates: {
    canonical: SITE_URL,
    types: {
      "application/rss+xml": `https://blog.${DOMAIN}/rss`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-terminal-black text-terminal-green font-mono antialiased">
        <MaintenanceGuard>{children}</MaintenanceGuard>
      </body>
    </html>
  );
}
