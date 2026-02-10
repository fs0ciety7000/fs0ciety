import { NextResponse } from "next/server";

const API_URL =
  process.env.INTERNAL_API_URL || "http://localhost:8080";

interface RSSPost {
  slug: string;
  title: string;
  author: string;
  excerpt: string;
  tags: string[];
  createdAt: string;
  readingTime: number;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  let posts: RSSPost[] = [];
  try {
    const res = await fetch(`${API_URL}/api/posts`, {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    posts = data.posts ?? [];
  } catch {
    // Return empty feed if backend is unreachable
  }

  const domain = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";
  const blogUrl = `https://blog.${domain}`;

  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${blogUrl}/${escapeXml(p.slug)}</link>
      <guid isPermaLink="true">${blogUrl}/${escapeXml(p.slug)}</guid>
      <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(p.excerpt)}</description>
      <author>${escapeXml(p.author)}</author>
      ${p.tags.map((t) => `<category>${escapeXml(t)}</category>`).join("\n      ")}
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>fs0ciety — /var/log/thoughts</title>
    <link>${blogUrl}</link>
    <description>Writings on security, systems, infrastructure, and the digital underground.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${blogUrl}/rss" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
