import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Chat + API sind nicht für die Indexierung gedacht
      disallow: ["/api/", "/chat/", "/login", "/register"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
