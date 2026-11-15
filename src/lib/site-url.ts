/**
 * The site's own address, as the world sees it.
 *
 * Written once here and read by everything that has to print an absolute URL —
 * the canonical tag, the share preview, `robots.txt` and the sitemap. A domain
 * that is not set falls back to the planned one, so a build without the
 * variable still produces a correct-looking address instead of `undefined`.
 */

const PLANNED = "https://m.plavinsky.co.il";

/** The canonical base, with no trailing slash. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || PLANNED;
  // A value pasted with a trailing slash would produce `//works` in every URL.
  return raw.replace(/\/+$/, "");
}

/** An absolute URL for a path inside the site. `""` is the home page. */
export function absoluteUrl(path = ""): string {
  if (!path) return siteUrl();
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
