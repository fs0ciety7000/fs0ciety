import type { Metadata } from "next";
import FingerprintClient from "./FingerprintClient";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";

export const metadata: Metadata = {
  title: "Browser Fingerprint",
  description:
    "Analyze your browser fingerprint — see what data your browser leaks including hardware, canvas, WebGL, fonts, and network info.",
  alternates: {
    canonical: `https://blog.${DOMAIN}/fingerprint`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function FingerprintPage() {
  return <FingerprintClient />;
}
