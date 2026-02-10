import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "fs0ciety",
  description: "Terminal blog & seedbox command center",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-terminal-black text-terminal-green font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
