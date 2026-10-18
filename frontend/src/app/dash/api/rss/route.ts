import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";

export const dynamic = "force-dynamic";

const DEFAULT_FEEDS = [
  "https://korben.info/feed",
  "https://www.theverge.com/rss/index.xml",
  "https://www.wired.com/feed/rss",
  "https://techcrunch.com/feed/",
  "https://fs0ciety.org/blog/rss",
  "https://devblog.fs0ciety.org/rss.xml",
].map((url) => ({ url, name: sourceName(url) }));

interface RSSFeedSource {
  url: string;
  name: string;
}

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

function safeArticleUrl(value: string): string {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.toString() : "";
  } catch {
    return "";
  }
}

function extractItems(xml: string, source: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Try RSS 2.0 <item> format
  const itemMatches = xml.matchAll(/<item[\s>]([\s\S]*?)<\/item>/gi);
  for (const match of itemMatches) {
    const block = match[1];
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim()
      || block.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim()
      || "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      || block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1]?.trim()
      || "";
    const safeLink = safeArticleUrl(link);
    if (title && safeLink) items.push({ title, link: safeLink, pubDate, source });
  }

  // Try Atom <entry> format if no items found
  if (items.length === 0) {
    const entryMatches = xml.matchAll(/<entry[\s>]([\s\S]*?)<\/entry>/gi);
    for (const match of entryMatches) {
      const block = match[1];
      const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
      const link = block.match(/<link[^>]*href="([^"]+)"/i)?.[1]?.trim() || "";
      const pubDate = block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim()
        || block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim()
        || "";
      const safeLink = safeArticleUrl(link);
      if (title && safeLink) items.push({ title, link: safeLink, pubDate, source });
    }
  }

  return items;
}

function sourceName(url: string): string {
  if (url.includes("korben")) return "Korben";
  if (url.includes("theverge")) return "The Verge";
  if (url.includes("wired")) return "Wired";
  if (url.includes("techcrunch")) return "TechCrunch";
  if (url.includes("fs0ciety")) return "fs0ciety";
  if (url.includes("devblog")) return "Devblog Cosmic Empires";
  return new URL(url).hostname;
}

function isSafeFeedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
    if (isIP(host) === 6) return false;
    const octets = host.split(".").map(Number);
    if (octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      const [a, b] = octets;
      if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && (b === 0 || b === 2 || b === 168)) || (a === 198 && (b === 18 || b === 19 || b === 51)) ||
        (a === 203 && b === 0)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchFeed(feed: RSSFeedSource): Promise<RSSItem[]> {
  let url = feed.url;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
    if (!isSafeFeedUrl(url)) return [];
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      headers: { "User-Agent": "fs0ciety-dash/1.0", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(8000),
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location || redirectCount === 3) return [];
      url = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) return [];
    const xml = await res.text();
    return extractItems(xml, feed.name).slice(0, 5);
  }
  return [];
}

async function getItems(customFeeds: RSSFeedSource[] = []) {
  const validCustom = customFeeds
    .filter((feed) => typeof feed?.url === "string" && typeof feed?.name === "string" && isSafeFeedUrl(feed.url))
    .slice(0, 8)
    .map((feed) => ({ url: feed.url, name: feed.name.trim().slice(0, 48) || sourceName(feed.url) }));
  const feeds = [...DEFAULT_FEEDS, ...validCustom];
  const results = await Promise.allSettled(feeds.map(fetchFeed));
  const allItems = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  allItems.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return db - da;
  });
  return allItems.slice(0, 50);
}

export async function GET() {
  try {
    return NextResponse.json({ items: await getItems() });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const feeds = Array.isArray(body.feeds) ? body.feeds.slice(0, 8) as RSSFeedSource[] : [];
    return NextResponse.json({ items: await getItems(feeds) });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
