import { NextRequest, NextResponse } from "next/server";

const ALLOWED_FEEDS = [
  "https://korben.info/feed",
  "https://www.theverge.com/rss/index.xml",
  "https://www.wired.com/feed/rss",
  "https://techcrunch.com/feed/",
  "https://fs0ciety.org/blog/rss",
];

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
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
    if (title) items.push({ title, link, pubDate, source });
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
      if (title) items.push({ title, link, pubDate, source });
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
  return new URL(url).hostname;
}

export async function GET(_req: NextRequest) {
  try {
    const results = await Promise.allSettled(
      ALLOWED_FEEDS.map(async (feedUrl) => {
        const res = await fetch(feedUrl, {
          next: { revalidate: 600 }, // cache 10 min
          headers: { "User-Agent": "fs0ciety-dash/1.0" },
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return extractItems(xml, sourceName(feedUrl)).slice(0, 5);
      })
    );

    const allItems: RSSItem[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    // Sort by date descending
    allItems.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

    return NextResponse.json({ items: allItems.slice(0, 25) });
  } catch {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
