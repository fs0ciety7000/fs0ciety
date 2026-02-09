"use client";

import { useParams, useRouter } from "next/navigation";
import { GlitchText } from "@/components/effects/GlitchText";
import { TypewriterText } from "@/components/effects/TypewriterText";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-terminal-black p-4 md:p-8 font-mono">
      {/* Header */}
      <div className="mb-8 pb-4 border-b border-terminal-gray-light">
        <button
          onClick={() => router.push("/")}
          className="text-xs text-terminal-green-dim hover:text-terminal-green transition-colors mb-4 block"
        >
          ← back to terminal
        </button>
        <GlitchText
          text={`cat ${params.slug}`}
          className="text-xl"
          intensity={1}
          hoverOnly
        />
      </div>

      {/* Post content placeholder */}
      <article className="prose prose-invert max-w-3xl text-terminal-green">
        <TypewriterText
          text={`Loading post: ${params.slug}...`}
          className="text-terminal-amber"
          charDelay={0.03}
        />

        <div className="mt-8 text-terminal-green-dim text-sm leading-relaxed">
          <p>
            This is a placeholder for the MDX blog post content.
            Posts will be loaded from SurrealDB and rendered as MDX
            with embedded React components.
          </p>
          <p className="mt-4">
            Navigate back to the terminal and use{" "}
            <code className="text-terminal-green">ls</code> to see available
            posts.
          </p>
        </div>
      </article>
    </div>
  );
}
