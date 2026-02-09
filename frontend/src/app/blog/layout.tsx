import type { Metadata } from "next";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";

export const metadata: Metadata = {
  title: {
    template: "%s — fs0ciety",
    default: "Blog — fs0ciety",
  },
  description: "Writings on security, systems, and the digital underground.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-terminal-black text-[#d4d4d4]">
      <BlogHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        {children}
      </main>
      <BlogFooter />
    </div>
  );
}
