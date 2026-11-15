import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The admin area is private; overlapping rules also stop the site from
      // appearing to be half-blocked in search engines.
      disallow: ["/admin", "/admin/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
