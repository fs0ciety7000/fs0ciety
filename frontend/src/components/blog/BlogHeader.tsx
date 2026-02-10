import Link from "next/link";

export function BlogHeader() {
  return (
    <header className="border-b border-terminal-gray-light bg-terminal-black-light">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/blog"
          className="flex items-center gap-3 group"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="fs0ciety"
            width={28}
            height={28}
            className="opacity-80 group-hover:opacity-100 transition-opacity"
          />
          <span className="text-terminal-green font-mono font-bold text-xl tracking-tight group-hover:text-terminal-green-dim transition-colors">
            fs0ciety
          </span>
          <span className="hidden sm:inline text-terminal-gray-light text-xs font-mono">
            //blog
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm font-mono">
          <Link
            href="/blog"
            className="text-terminal-green-dim hover:text-terminal-green transition-colors"
          >
            posts
          </Link>
          <Link
            href="/"
            className="text-terminal-green-dim hover:text-terminal-green transition-colors flex items-center gap-1"
          >
            <span className="text-terminal-green opacity-50">$</span>
            terminal
          </Link>
        </nav>
      </div>
    </header>
  );
}
