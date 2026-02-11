import type { Metadata } from "next";
import IntrudersClient from "./IntrudersClient";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";

export const metadata: Metadata = {
  title: "Intruder Log",
  description:
    "Live honeypot intrusion log — monitoring unauthorized access attempts against fs0ciety infrastructure.",
  alternates: {
    canonical: `https://blog.${DOMAIN}/intruders`,
  },
  openGraph: {
    title: "Intruder Log — fs0ciety",
    description:
      "Live honeypot intrusion log — monitoring unauthorized access attempts.",
    url: `https://blog.${DOMAIN}/intruders`,
  },
};

export default function IntrudersPage() {
  return <IntrudersClient />;
}
