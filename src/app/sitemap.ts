import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";
import { getWorks } from "@/lib/works";

/**
 * The pages search engines should know about.
 *
 * `robots.ts` points at this file, so it has to exist. Works come from the
 * database: a newly added work is listed on the next build, and the page
 * itself is read fresh anyway — the sitemap is a map, not a cache.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const works = await getWorks().catch(() => []);
  const now = new Date();

  return [
    { url: absoluteUrl(), lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/works"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    ...works.filter((work) => work.published).map((work) => ({
      url: absoluteUrl(`/works/${work.slug}`),
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
