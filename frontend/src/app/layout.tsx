import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "fs0ciety",
  description: "Terminal blog & seedbox command center",
  icons: [
    { rel: "icon", url: "/icons8-fsociety-mask-color-32.png", sizes: "32x32", type: "image/png" },
    { rel: "icon", url: "/icons8-fsociety-mask-color-16.png", sizes: "16x16", type: "image/png" },
    { rel: "apple-touch-icon", url: "/icons8-fsociety-mask-color-180.png", sizes: "180x180" },
  ],
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
