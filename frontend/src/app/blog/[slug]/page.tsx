import type { Metadata } from "next";
import BlogPostClient from "./BlogPostClient";

const API_URL = process.env.INTERNAL_API_URL || "http://localhost:3001";
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";

interface PostData {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  published: boolean;
  author: string;
  createdAt: string;
  updatedAt: string;
  readingTime: number;
  wordCount: number;
  excerpt: string;
  contentHash: string;
  views: number;
}

async function fetchPost(slug: string): Promise<PostData | null> {
  try {
    const res = await fetch(`${API_URL}/api/posts/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Dynamic metadata for SEO ──────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  const blogUrl = `https://blog.${DOMAIN}`;
  const postUrl = `${blogUrl}/${post.slug}`;
  const description = post.excerpt || post.content.slice(0, 160).replace(/[#*\[\]`]/g, "");

  return {
    title: post.title,
    description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    alternates: {
      canonical: postUrl,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: postUrl,
      siteName: "fs0ciety",
      publishedTime: post.createdAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      tags: post.tags,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: post.title,
      description,
    },
  };
}

// ── Page component (server) ───────────────────────────────

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchPost(slug);

  // JSON-LD structured data for the article
  const jsonLd = post
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt || post.content.slice(0, 160),
        author: {
          "@type": "Person",
          name: post.author,
          url: `https://${DOMAIN}/profile/${post.author}`,
        },
        datePublished: post.createdAt,
        dateModified: post.updatedAt || post.createdAt,
        url: `https://blog.${DOMAIN}/${post.slug}`,
        publisher: {
          "@type": "Organization",
          name: "fs0ciety",
          url: `https://${DOMAIN}`,
        },
        keywords: post.tags.join(", "),
        wordCount: post.wordCount,
        articleSection: "Security & Technology",
        inLanguage: "en-US",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://blog.${DOMAIN}/${post.slug}`,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BlogPostClient initialPost={post} slug={slug} />
    </>
  );
}
