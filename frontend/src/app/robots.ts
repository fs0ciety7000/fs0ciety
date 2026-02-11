import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "fs0ciety.org";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/profile/settings", "/login", "/dashboard/"],
      },
    ],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
