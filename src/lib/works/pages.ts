import { bookletPages } from "./booklet-pages";
import type { WorkAsset } from "./types";

/**
 * The page pictures of a PDF asset, wherever they were rendered.
 *
 * A PDF stored under `<slug>/presentation.pdf` or `<folder>/<file>.pdf` has its
 * pages in `<slug>/pages/page-NN.webp` (or `<folder>/pages/…`) — the same
 * convention both the upload route and `tools/render-brochure-pages.mjs` use,
 * so a file from the admin and a file from the project are read alike.
 */

/** Page pictures in storage at `<slug>/pages/page-NN.webp`. */
export type AdminPages = { pageCount: number; pageWidth?: number; aspect?: number };
const ADMIN_PAGES = new WeakMap<object, AdminPages>();

/**
 * What the admin recorded for this asset on upload — how many pages its PDF
 * has, and the first page's height ÷ width. Kept beside the asset rather than
 * inside it, so the page sizes stay what they say they are.
 */
export function setAdminPages(asset: object, info: AdminPages): void {
  ADMIN_PAGES.set(asset, info);
}

export function adminPages(asset: object): AdminPages | undefined {
  return ADMIN_PAGES.get(asset);
}

/** "…/works/<slug>/<file>.pdf" → "…/works/<slug>/pages" */
export function pagesBase(pdfUrl: string): string {
  const cut = pdfUrl.lastIndexOf("/");
  return cut === -1 ? pdfUrl : `${pdfUrl.slice(0, cut)}/pages`;
}

/**
 * A PDF's first rendered page, shaped as a picture.
 *
 * A work saved from a PDF has no image of its own; the page rendered beside
 * the file is what its tile, its share preview and the admin thumbnail show.
 */
export function pdfFirstPage(pdf: WorkAsset): WorkAsset {
  const first = pdf.pages?.[0];
  return {
    src: `${pagesBase(pdf.src)}/page-01.webp`,
    type: "image",
    caption: pdf.caption,
    // The rendered page's own size. A work read back from the database only
    // knows the file's width and the page count; the page is then laid out as
    // square, which every tile's frame clips like any other shape, and the
    // picture is shown whole inside it.
    width: first?.width || pdf.width,
    height: first?.height || first?.width || pdf.width,
  };
}

/**
 * Pages of a project booklet, whose sizes ship with the site.
 *
 * A booklet stored as `<slug>/presentation.pdf` was rendered by
 * `tools/render-brochure-pages.mjs`, and the tool left the size of each page in
 * the manifest — enough to lay every page out without a request.
 */
export function manifestPages(pdfUrl: string): { width: number; height: number }[] | undefined {
  const match = /\/works\/([^/]+)\/presentation\.pdf$/.exec(pdfUrl);
  return match ? bookletPages[match[1]] : undefined;
}

/** Whether the project ships the page sizes of this file (a booklet). */
export function hasManifest(pdfUrl: string): boolean {
  return manifestPages(pdfUrl) !== undefined;
}
