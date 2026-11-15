import { unstable_noStore as noStore } from "next/cache";
import { generatedWorks as seededWorks } from "./generated";
import type { Work, WorkAsset } from "./types";
import { fetchPublishedWorks, loadPageSizes, worksComeFromDatabase, worksRevisionNow } from "./remote";
import { renderFresh } from "@/lib/render-fresh";
import { invalidateWorks, keepWorks, keptWorks, worksGeneration } from "@/lib/shared-cache";
import { hasManifest, pdfFirstPage } from "./pages";

export { pdfFirstPage } from "./pages";

export type { Work, WorkAsset } from "./types";
export type { WorkType } from "@/content/types";
export { isValidSlug } from "./draft";
export type { WorkDraft } from "./draft";

/** Every work carries a resolved cover, so components never need a fallback. */
export type ResolvedWork = Work & { cover: WorkAsset };

/**
 * Where the published list is kept between requests, and when it may be used
 * again.
 *
 * The list itself is cheap to read, but the site reads it on every page view —
 * the stamp (a value the database moves on every save) is what decides whether
 * a kept list is still the site's list.
 *
 * The one rule that makes this safe: a list is only kept together with a stamp
 * read *after* its query returned. A stamp read before the query may belong to
 * a save the query had not yet seen, and keeping the list under it would mark
 * a list older than its own stamp as current — the edit would then never be
 * read again. See `freshRemoteWorks`.
 *
 * A failed read shows an empty gallery and keeps nothing: falling back to the
 * seeded list here would bring back its placeholder images whenever the
 * database blinks. An empty gallery is honest, and the next view asks again.
 */

/**
 * Drops the kept list and bumps the generation. Called by every admin change:
 * the work that was just edited is read again on the very next page view, and
 * a page whose render read the generation is rendered again rather than served
 * from the copy before the save.
 */
export function forgetRemoteWorks(): void {
  invalidateWorks();
  covers.clear();
}

/**
 * The published list, from the kept copy when the database's stamp proves it
 * is current, and from the database otherwise.
 *
 * The stamp is read first. The kept copy is used only when that stamp is the
 * one read *after* the kept copy's own query — the only stamp that can stand
 * for it. Reading the stamp before the query instead would let a save that
 * landed in between go unnoticed, which is exactly the edit that then never
 * shows on the site.
 */
async function freshRemoteWorks(): Promise<Work[]> {
  const revision = await worksRevisionNow();
  if (revision !== null) {
    const kept = keptWorks<Work[]>();
    if (kept && kept.revision === revision) return kept.works;
  }

  const list = await fetchPublishedWorks();
  if (!list) return [];

  // Kept under a stamp read *after* the query, so it can never claim to be
  // newer than it is.
  const settled = await worksRevisionNow();
  if (settled !== null) keepWorks(list, settled);
  return list;
}

async function loadPublishedList(): Promise<Work[]> {
  if (!worksComeFromDatabase()) return seededWorks.filter((w) => w.published);
  try {
    const out = await freshRemoteWorks();
      return out;
  } catch (error) {
    // A read that failed lands here — an empty list, never the placeholders.
    // Logged because the page itself shows only the empty gallery.
    console.error("[works] list unavailable:", error instanceof Error ? error.message : error);
    return [];
  }
}

/** Covers already resolved, by the key that fully describes the work's files. */
const covers = new Map<string, WorkAsset>();

/**
 * The file whose first page stands for the work — the reveal, not the
 * build-up: the last file of a teaser campaign is its ad.
 */
function pickPdf(assets: WorkAsset[]): WorkAsset | undefined {
  return assets.filter((asset) => asset.type === "pdf").at(-1);
}

/**
 * The picture a work shows where only one is needed — its own cover, else its
 * first picture, else the first page of its last PDF, else the placeholder.
 */
function coverOf(work: Work): WorkAsset {
  // A work saved from a PDF only has the file; its first rendered page stands
  // in for the picture, so the tile and the page's share preview are not empty.
  // The page is taken even with no recorded count: it is rendered beside the
  // file whether or not the count was written down. What the tile shows for a
  // campaign with several pieces is decided by `cardCover`.
  const pdf = pickPdf(work.assets);
  const pdfPage = pdf ? pdfFirstPage(pdf) : undefined;

  return (
    work.cover ??
    work.assets.find((asset) => asset.type === "image") ??
    pdfPage ?? {
      src: "/works/placeholder.svg",
      type: "image" as const,
      width: 1000,
      height: 1400,
    }
  );
}

/**
 * The cover is kept, the work beside it is not.
 *
 * Keeping the whole resolved work meant that a work edited after its first view
 * was served from that kept copy — the title, the year and the text stayed as
 * they were on the first view, while the list's stamp said everything was
 * current. Only the cover is worth keeping: it is the same picture for the life
 * of the work, and its key covers the address, the pictures and the recorded
 * cover, so a work whose files were replaced is resolved afresh. The kept work
 * itself is always the one read for this request.
 */
function resolveCover(work: Work): ResolvedWork {
  const key = `${work.slug}|${work.assets.map((a) => a.src).join(",")}|${work.cover?.src ?? ""}`;
  const cached = covers.get(key);
  if (cached) return { ...work, cover: cached };

  const cover = coverOf(work);
  covers.set(key, cover);
  return { ...work, cover };
}

function inDisplayOrder(works: Work[]): ResolvedWork[] {
  return [...works].sort((a, b) => a.order - b.order).map(resolveCover);
}

/**
 * All published works, in display order.
 *
 * Every read is outside every cache — `noStore`, the kept list decided by the
 * database's stamp, and `renderFresh` before the list is read — because what
 * this returns is the edit the admin area just saved.
 */
export async function getWorks(): Promise<ResolvedWork[]> {
  noStore();
  await renderFresh();
  worksGeneration();
  return inDisplayOrder(await loadPublishedList());
}

/**
 * Gives each uploaded PDF its real page count, and its pages' shapes when
 * there is more than one.
 *
 * The database records an uploaded file's page count in one column and its
 * width in another — and a work saved before that count was written has
 * neither. The pages sit beside the file, so they are what says how many there
 * are; the first page alone needs no shape of its own.
 */
async function withPageSizes(assets: WorkAsset[]): Promise<WorkAsset[]> {
  return Promise.all(
    assets.map(async (asset) => {
      if (asset.type !== "pdf" || hasManifest(asset.src)) return asset;
      const sized = await loadPageSizes(asset.src);
      if (sized.length === 0) return asset;
      const pages =
        sized.length > 1
          ? sized
          : [{ width: asset.pages?.[0]?.width || asset.width || 0, height: asset.pages?.[0]?.height ?? 0 }];
      return { ...asset, pages, width: asset.width ?? pages[0]?.width, height: pages.length };
    }),
  );
}

/** A single work by slug, or `undefined` if it doesn't exist or is hidden. */
export async function getWork(slug: string): Promise<ResolvedWork | undefined> {
  const works = await loadPublishedList();
  const work = works.find((w) => w.slug === slug);
  return work?.published ? resolveCover(work) : undefined;
}

/** Like `getWork`, with each uploaded PDF's pages counted from storage. */
export async function getWorkReadings(slug: string): Promise<ResolvedWork | undefined> {
  const work = await getWork(slug);
  if (!work) return undefined;
  return resolveCover({ ...work, assets: await withPageSizes(work.assets) });
}

/** Slugs of every published work — used for static params. */
export async function getWorkSlugs(): Promise<string[]> {
  return (await getWorks()).map((w) => w.slug);
}

/** Distinct categories in the order they first appear. */
export async function getCategories(): Promise<string[]> {
  const seen = new Set<string>();
  for (const w of await getWorks()) seen.add(w.category);
  return [...seen];
}
