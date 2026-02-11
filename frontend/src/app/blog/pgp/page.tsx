import type { Metadata } from "next";
import PGPClient from "./PGPClient";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";

export const metadata: Metadata = {
  title: "PGP Key & Warrant Canary",
  description:
    "PGP public key, signature verification instructions, warrant canary, and OPSEC contact guidelines for fs0ciety.",
  alternates: {
    canonical: `https://blog.${DOMAIN}/pgp`,
  },
  openGraph: {
    title: "PGP Key & Warrant Canary — fs0ciety",
    description:
      "PGP public key, signature verification, and warrant canary.",
    url: `https://blog.${DOMAIN}/pgp`,
  },
};

export default function PGPPage() {
  return <PGPClient />;
}
