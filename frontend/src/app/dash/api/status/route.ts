import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const urlsParam = req.nextUrl.searchParams.get("urls");
  if (!urlsParam) return NextResponse.json([]);

  const urls = urlsParam.split(",").filter(Boolean);

  const results = await Promise.all(
    urls.map(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
          cache: "no-store",
          redirect: "follow",
        });
        clearTimeout(timeout);
        return { url, up: res.status < 500 };
      } catch {
        clearTimeout(timeout);
        return { url, up: false };
      }
    })
  );

  return NextResponse.json(results);
}
