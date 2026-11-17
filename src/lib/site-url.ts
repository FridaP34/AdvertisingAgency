/**
 * The site's own address, as the world sees it.
 *
 * Written once here and read by everything that has to print an absolute URL —
 * the canonical tag, the share preview, `robots.txt` and the sitemap. A domain
 * that is not set falls back to the planned one, so a build without the
 * variable still produces a correct-looking address instead of `undefined`.
 */

// Both names open the site; Vercel redirects the bare domain to `www`, so
// `www` is the address that must appear in the canonical tag, the sitemap and
// the share preview. Any other spelling is normalised to it below, so a stray
// value in the environment cannot split the site's identity in two.
const PLANNED = "https://www.plavinsky.co.il";

/** The canonical base, with no trailing slash. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || PLANNED;
  // A value pasted with a trailing slash would produce `//works` in every URL.
  const trimmed = raw.replace(/\/+$/, "");
  // `plavinsky.co.il` and `https://www.plavinsky.co.il` are the same site, but
  // a canonical tag has to be one string — settle on the `www` form.
  return trimmed.replace(/^(https?:\/\/)?plavinsky\.co\.il$/i, PLANNED);
}

/** An absolute URL for a path inside the site. `""` is the home page. */
export function absoluteUrl(path = ""): string {
  if (!path) return siteUrl();
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
