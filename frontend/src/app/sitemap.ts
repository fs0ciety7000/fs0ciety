import type { MetadataRoute } from "next";

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3001";

interface SitemapPost {
  slug: string;
  createdAt: string;
  updatedAt?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";
  const baseUrl = `https://${domain}`;
  const blogUrl = `https://blog.${domain}`;

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: blogUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${blogUrl}/pgp`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${blogUrl}/rss`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.2,
    },
  ];

  // Dynamic blog posts
  let postPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_URL}/api/posts`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const posts: SitemapPost[] = data.posts ?? [];
      postPages = posts.map((post) => ({
        url: `${blogUrl}/${post.slug}`,
        lastModified: new Date(post.updatedAt || post.createdAt),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Backend unreachable — return static pages only
  }

  return [...staticPages, ...postPages];
}
