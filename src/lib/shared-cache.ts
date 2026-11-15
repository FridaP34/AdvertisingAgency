/**
 * What the works cache tells the running server, one instance per process.
 *
 * A change in the admin area has to reach the public site on the very next
 * page view. Every works page calls `worksGeneration()` inside `unstable_noStore`,
 * so that read is part of the page's dynamic data; a save bumps the number
 * (`invalidateWorks`). Next re-renders the page — its HTML *and* the payload
 * the browser is given — instead of serving the copy from before the save.
 *
 * Why a counter rather than only `revalidatePath`: a page that revalidates
 * itself is rendered again on the next request, but a *server action* that does
 * it, in a route Next judged static, kept serving the page from before the save
 * in development — the list read inside the render was fresh, the page that was
 * sent was not. Nothing in the render could see that it had to run again; a
 * value read in the render that the save changes can.
 *
 * The list itself is kept here too, under the stamp it was read with, so the
 * renders that do happen for other reasons reuse it instead of querying.
 * Everything hangs off `globalThis`: during development Next can hold more than
 * one copy of a module, each with its own top-level variables.
 */

/** Bumped by every admin change to the works. */
const GENERATION = Symbol.for("mindy.works-generation");
/** The list kept between renders, with the stamp it was read under. */
const CACHE = Symbol.for("mindy.works-cache");

type Holder = typeof globalThis & {
  [GENERATION]?: number;
  [CACHE]?: { works: unknown; revision: string };
};

/** The current generation. Read inside the page's dynamic data. */
export function worksGeneration(): number {
  const holder = globalThis as Holder;
  holder[GENERATION] ??= 0;
  return holder[GENERATION];
}

/**
 * Tells the running server the works changed: the next page view renders
 * again, and the kept list is no longer used.
 */
export function invalidateWorks(): void {
  const holder = globalThis as Holder;
  holder[GENERATION] = (holder[GENERATION] ?? 0) + 1;
  holder[CACHE] = undefined;
}

/** The kept list and the stamp it was read under. */
export function keptWorks<R>(): { works: R; revision: string } | undefined {
  return (globalThis as Holder)[CACHE] as { works: R; revision: string } | undefined;
}

/** Keeps the list under the stamp read after its query. */
export function keepWorks(works: unknown, revision: string): void {
  (globalThis as Holder)[CACHE] = { works, revision };
}
