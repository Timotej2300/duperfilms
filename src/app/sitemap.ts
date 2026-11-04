import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://duperfilms.eu";
  return ["", "/login", "/register", "/p/terms", "/p/privacy", "/p/cookies", "/p/contact", "/p/support"].map((p) => ({ url: `${base}${p}` }));
}
