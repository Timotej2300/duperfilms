import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://duperfilms.eu";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/p/"], disallow: ["/admin", "/api", "/watch", "/account"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
