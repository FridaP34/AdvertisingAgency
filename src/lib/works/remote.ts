import { unstable_noStore } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import type { WorkAsset, Work } from "./types";
import type { WorkType } from "@/content/types";
import { manifestPages, pagesBase, setAdminPages } from "./pages";

/**
 * Reads works from Supabase, for the public site's build and server render.
 *
 * Uses a plain (non-cookie) client: the public tables only expose published
 * rows through Row Level Security, so no session is needed. A bare client also
 * keeps this module usable from `generateStaticParams`, outside a request.
 * Its calls bypass Next's request cache — see the `fetch` in `db`.
 */

type WorkRow = {
  id: string;
  slug: string;
  title: string;
  client: string;
  category: string;
  work_type: WorkType;
  summary: string | null;
  story: string | null;
  year: string | null;
  display_order: number;
  published: boolean;
  works_assets: AssetRow[] | null;
};

type AssetRow = {
  url: string;
  asset_type: "image" | "pdf";
  caption: string | null;
  width: number | null;
  height: number | null;
  display_order: number;
};

let client: SupabaseClient | null = null;
let clientKey = "";

/**
 * One client per connection setting. This module lives as long as the server
 * process, so if the URL or key changes while it runs a cached client would
 * keep reading the old project — the site would show data the admin area
 * never wrote.
 */
function db(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  const key = `${url}|${anonKey}`;
  if (client && clientKey === key) return client;
  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clientKey = key;
  return client;
}

const SELECT =
  "id, slug, title, client, category, work_type, summary, story, year, display_order, published, " +
  "works_assets(url, asset_type, caption, width, height, display_order)";

/** Health probe: the public API answering for this project. */
export function databaseReachable(): Promise<boolean> {
  return Promise.resolve(
    db()
      .rpc("works_version")
      .then(
        ({ error }) => !error,
        () => false,
      ),
  );
}

function toAsset(row: AssetRow): WorkAsset {
  const base: WorkAsset = { src: row.url, type: row.asset_type, caption: row.caption ?? undefined };

  if (row.asset_type !== "pdf") {
    return { ...base, width: row.width ?? undefined, height: row.height ?? undefined };
  }

  // A PDF is read as its page pictures. A project booklet has their real sizes
  // in the manifest. One uploaded through the admin records the page count in
  // `height` and the first page's width in `width`; the page's shape is then
  // read from the picture itself — see `loadPageSizes` — rather than guessed
  // from the count, which put a one-page ad's picture on a page of another
  // shape.
  const pages = manifestPages(row.url);
  if (pages) return { ...base, pages };

  // No count recorded: the file is taken as having one page. Every PDF saved
  // so far has its first page beside it, and a row that lost its count must
  // still show that page as the picture — `getWorkReadings` reads the real
  // number of pages and replaces this provisional one.
  const pageCount = Math.max(row.height ?? 0, 1);
  const width = row.width ?? undefined;

  const asset: WorkAsset = {
    ...base,
    width,
    pages: Array.from({ length: pageCount }, () => EMPTY_SIZE),
  };
  if (width) setAdminPages(asset, { pageCount, pageWidth: width });
  return asset;
}

/** A page whose size is unknown: the reader measures it as it loads. */
const EMPTY_SIZE = { width: 0, height: 0 };

function toWork(row: WorkRow): Work {
  const assets = [...(row.works_assets ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .map(toAsset);

  return {
    slug: row.slug,
    title: row.title,
    client: row.client,
    category: row.category,
    type: row.work_type,
    summary: row.summary ?? "",
    story: row.story ?? undefined,
    year: row.year ?? undefined,
    assets,
    order: row.display_order,
    published: row.published,
  };
}

/**
 * The stamp the works tables carry right now (`supabase/schema.sql`). A save
 * moves it, so the cache in `./index` compares it on every read: a different
 * stamp means the list from before the save is dropped and read again.
 *
 * Asked on every render — one small row — and never remembered: a stamp kept
 * from an earlier render is exactly the mistake it is here to prevent. Nor is
 * a read shared between views: one that joins a read started by an earlier
 * view would be told "the stamp has not moved since I began", when in truth it
 * began before it and may have been answered before a save that landed after
 * it began — exactly the false equality the kept list cannot afford. It costs
 * one small row per view, and it is right.
 */
function worksRevision(): Promise<string | null> {
  unstable_noStore();
  return Promise.resolve(
    db()
      .rpc("works_version")
      .then(
        ({ data, error }) => (error || typeof data !== "string" || data.length === 0 ? null : data),
        () => null,
      ),
  );
}

/** The works' stamp, for the kept list in `./index`. */
export function worksRevisionNow(): Promise<string | null> {
  return worksRevision();
}

/**
 * All published works, ordered. Returns `null` when a query fails.
 *
 * Never from a cache: the list is read on every page view and is what the
 * admin area just changed.
 */
export async function fetchPublishedWorks(): Promise<Work[] | null> {
  unstable_noStore();
  const { data, error } = await db()
    .from("works")
    .select(SELECT)
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[works] Supabase read failed:", error.message);
    return null;
  }

  return (data as unknown as WorkRow[]).map(toWork);
}

/**
 * Sizes of page-NN.webp beside an uploaded PDF, page 1 first, as served.
 *
 * Read from each picture's header — the same few bytes `/admin/api/page-size`
 * reads for the browser — because the database keeps only a PDF's page count
 * and the upload's width, not a shape per page. Reading stops at the first
 * missing page; `[]` means the sizes could not be read and the browser's own
 * reader is left to measure them.
 */
export async function loadPageSizes(pdfUrl: string): Promise<{ width: number; height: number }[]> {
  const prefix = `${pagesBase(pdfUrl)}/`;

  // A page picture is written once, on upload, so its sizes never change —
  // they are read once per PDF and remembered for the life of the process.
  // (Not through `unstable_cache`: that one is only warmed once a page is
  // visited, and a read from inside a render can come back stale.) An empty
  // answer costs nothing to repeat: it may simply be a PDF whose pages have
  // not finished uploading.
  if (pageSizes.has(prefix)) return pageSizes.get(prefix)!;

  const sizes: { width: number; height: number }[] = [];
  for (let index = 1; index <= MAX_PAGES; index += 1) {
    const url = `${prefix}page-${String(index).padStart(2, "0")}.webp`;
    const size = await fetch(url, { cache: "no-store" })
      .then(async (response) => (response.ok ? webpSize(Buffer.from(await response.arrayBuffer())) : null))
      .catch(() => null);
    if (!size) break;
    sizes.push(size);
  }

  if (sizes.length > 0) pageSizes.set(prefix, sizes);
  return sizes;
}

/** The same ceiling the upload's render route applies to a PDF. */
const MAX_PAGES = 160;

/** Page sizes already read, by the PDF's pages folder. */
const pageSizes = new Map<string, { width: number; height: number }[]>();

/** Width and height from a WebP header — a page's shape, without decoding it. */
function webpSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30 || buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buf.toString("latin1", 12, 16);
  if (chunk === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/** `true` once the database should be the source of truth. */
export function worksComeFromDatabase(): boolean {
  return isSupabaseConfigured();
}
