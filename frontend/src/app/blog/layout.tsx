import type { Metadata } from "next";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { SearchDialog } from "@/components/blog/SearchDialog";
import { BlogShell } from "@/components/blog/BlogShell";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";

export const metadata: Metadata = {
  title: {
    template: "%s — fs0ciety blog",
    default: "/var/log/thoughts — fs0ciety blog",
  },
  description:
    "Writings on security, systems, infrastructure, and the digital underground.",
  alternates: {
    canonical: `https://blog.${DOMAIN}`,
    types: {
      "application/rss+xml": `https://blog.${DOMAIN}/rss`,
    },
  },
  openGraph: {
    type: "website",
    siteName: "fs0ciety",
    title: "/var/log/thoughts — fs0ciety blog",
    description:
      "Writings on security, systems, infrastructure, and the digital underground.",
    url: `https://blog.${DOMAIN}`,
    locale: "en_US",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BlogShell>
      <div className="blog-bg min-h-screen flex flex-col" style={{ background: "var(--spectr-bg-primary)", color: "var(--spectr-text-primary)", transition: "background 0.4s, color 0.4s" }}>
        <div className="noise-overlay blog-noise" aria-hidden="true" style={{ opacity: "var(--spectr-noise-opacity)" }} />
        <BlogHeader />
        <SearchDialog />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
          {children}
        </main>
        <BlogFooter />
      </div>
    </BlogShell>
  );
}
