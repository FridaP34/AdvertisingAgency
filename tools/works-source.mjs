/**
 * The bridge between what is in `SampleAds/` and what the site shows.
 *
 * Two places matter:
 *
 *   SampleAds/מודעות בודדות/   — single ads. Each file becomes its own work.
 *   SampleAds/<לקוח>/          — a campaign: a series of pieces (teasers
 *                                first, then the ads), shown together.
 *
 * Rules, applied to both:
 *   * Pieces named `טיזר…` open the series, followed by `מודעה…` / `פרסומת…`.
 *     Anything named otherwise is placed by `ORDER_HINTS` below, and goes last.
 *   * A PDF named `מצגת…` (or, in older folders, just the client's name) is not
 *     a piece: it becomes the work's downloadable presentation PDF.
 *   * `לוגו…` files, `.txt` notes and the working files in `SKIP` are not shown.
 *
 * Used by `tools/build-works-assets.mjs`.
 */
import path from "node:path";
import { readdir } from "node:fs/promises";
import { statSync } from "node:fs";

export const SAMPLE_DIR = "SampleAds";
export const SINGLE_DIR = "מודעות בודדות";
/** Long-form booklets — each file is its own work of type `brochure`. */
export const BROCHURE_DIR = "חוברות";

/** Folders in SampleAds that are not campaigns. */
const NOT_A_CLIENT = new Set([SINGLE_DIR, BROCHURE_DIR]);

/** Never shown: logo source files and print-ready working files. */
const SKIP = new Set(["L0G0 פלבינסקי 03-5700806.pdf", "04 התעמלות.pdf"]);

/** Display order for pieces whose names do not say what they are. */
const ORDER_HINTS = [
  [5, /^(CamScanner|מרמולה\.pdf|יעקובוביץ\.pdf)/],
  [20, /^(אביב|2020|מודעה\s*0011|מודעה 7|מודעה 5 copy)/],
  [40, /^(פנינים|רכיס|רכסים|צמיד זהב|3\.pdf$)/],
  [60, /^מודעה חיסול/],
];

/** A folder PDF named after its client that is a long deck, not a piece. */
const DECK_MIN_KB = 3000;

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const PDF_EXT = /\.pdf$/i;

/** Sort key of one file: teasers, then ads, then the rest. */
function pieceRank(file) {
  if (/^טיזר/.test(file)) return 0;
  if (/^(מודעה|פרסומת)/.test(file)) return 10;
  for (const [rank, pattern] of ORDER_HINTS) if (pattern.test(file)) return rank;
  return 30;
}

function naturalCompare(a, b) {
  return a.localeCompare(b, "he", { numeric: true, sensitivity: "base" });
}

function isPiece(file) {
  return (
    (IMAGE_EXT.test(file) || PDF_EXT.test(file)) &&
    !SKIP.has(file) &&
    !/^לוגו/.test(file) &&
    !/^מצגת/.test(file)
  );
}

/** Files of one folder, sorted the way a visitor should read them. */
export function orderPieces(files) {
  return files.filter(isPiece).sort((a, b) => {
    const byRank = pieceRank(a) - pieceRank(b);
    if (byRank !== 0) return byRank;
    return naturalCompare(a, b);
  });
}

/**
 * The presentation PDF of a folder, if it has one: a file named `מצגת…`, or —
 * in the older folders — one PDF that carries only the folder's name.
 *
 * A file named after the folder is only a deck when it is heavy (`DECK_MIN_KB`):
 * in some folders that same name is just a regular ad, and drawing it as the
 * download would hide it from the gallery.
 */
export function findPresentation(files, dir = "", root = "") {
  const named = files.find((f) => /^מצגת.*\.pdf$/i.test(f));
  if (named) return named;
  const legacy = files.find(
    (f) => PDF_EXT.test(f) && dir && f.replace(PDF_EXT, "").trim() === dir.trim(),
  );
  if (!legacy) return null;
  const heavy = root ? sizeKb(path.join(root, SAMPLE_DIR, dir, legacy)) >= DECK_MIN_KB : true;
  return heavy ? legacy : null;
}

/** File size in KB, or 0 when it cannot be read. */
function sizeKb(file) {
  try {
    return statSync(file).size / 1024;
  } catch {
    return 0;
  }
}

/** `"מודעה 3.pdf"` → `"מודעה 3"`. */
export function pieceLabel(file) {
  return file.replace(/\.[^.]+$/, "").replace(/\s+/g, " ").trim();
}

/** `"מודעה 3"` → `"ad-3"`; unnamed pieces get their position. */
export function pieceSlug(file, index) {
  const label = pieceLabel(file);
  const number = label.match(/(\d+)/)?.[1];
  if (/^טיזר/.test(label)) return `teaser-${number ?? index + 1}`;
  if (/^(מודעה|פרסומת)/.test(label)) return `ad-${number ?? index + 1}`;
  return `piece-${String(index + 1).padStart(2, "0")}`;
}

/** Hebrew → Latin, so a slug stays readable in a URL. */
const TRANSLIT = {
  א: "a", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z", ח: "ch", ט: "t", י: "y",
  כ: "k", ך: "k", ל: "l", מ: "m", ם: "m", נ: "n", ן: "n", ס: "s", ע: "a", פ: "p",
  ף: "f", צ: "tz", ץ: "tz", ק: "k", ר: "r", ש: "sh", ת: "t",
};

/** A readable Latin slug from any label; falls back to `fallback` if nothing Latin remains. */
export function latinSlug(label, fallback) {
  const slug = [...label.toLowerCase()]
    .map((char) => (TRANSLIT[char] !== undefined ? TRANSLIT[char] : char))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug.length >= 2 ? slug : fallback;
}

/**
 * Every campaign and single ad that has something to show:
 *
 *   { kind: "series" | "single", dir, label, pieces: [file…], presentation }
 *
 * `dir` is the folder name (for a single ad, `מודעות בודדות`), `label` is the
 * folder name or the file name without its extension.
 */
export async function scanSampleAds(root) {
  const sample = path.join(root, SAMPLE_DIR);
  const all = await readdir(sample, { withFileTypes: true });
  const folders = all.filter((e) => e.isDirectory());
  // Root-level PDFs (תמא, חוברת קיץ…) are loose singles: each gets its own work.
  const loose = all.filter(
    (e) => e.isFile() && PDF_EXT.test(e.name) && !SKIP.has(e.name) && !/^לוגו/.test(e.name),
  );

  const campaigns = [];
  for (const entry of folders) {
    if (NOT_A_CLIENT.has(entry.name)) continue;
    const files = (await readdir(path.join(sample, entry.name))).sort(naturalCompare);
    const presentation = findPresentation(files, entry.name, root);
    const pieces = orderPieces(files).filter((f) => f !== presentation);
    if (pieces.length === 0) continue;
    campaigns.push({ kind: "series", dir: entry.name, label: entry.name, pieces, presentation });
  }

  const singles = [];
  const singleFiles = (await readdir(path.join(sample, SINGLE_DIR))).sort(naturalCompare);
  // Loose PDFs in the root of SampleAds get the result folder `single-slug/`.
  for (const file of loose) {
    singles.push({
      kind: "single",
      dir: SAMPLE_DIR,
      label: pieceLabel(file.name),
      pieces: [file.name],
      presentation: null,
    });
  }

  for (const file of singleFiles) {
    if (!IMAGE_EXT.test(file) && !PDF_EXT.test(file)) continue;
    if (SKIP.has(file) || /^לוגו/.test(file) || /^מצגת/.test(file)) continue;
    singles.push({
      kind: "single",
      dir: SINGLE_DIR,
      label: pieceLabel(file),
      pieces: [file],
      presentation: null,
    });
  }

  // Booklets: each file is one work, shown only under the "חוברות" filter.
  const brochures = [];
  const brochureDir = path.join(sample, BROCHURE_DIR);
  let bookletFiles = [];
  try {
    bookletFiles = (await readdir(brochureDir)).sort(naturalCompare);
  } catch {
    // No booklets folder — nothing to show.
  }
  for (const file of bookletFiles) {
    if (!PDF_EXT.test(file) || SKIP.has(file) || /^לוגו/.test(file)) continue;
    brochures.push({
      kind: "brochure",
      dir: BROCHURE_DIR,
      label: pieceLabel(file),
      pieces: [file],
      presentation: null,
    });
  }

  return { campaigns, singles, brochures };
}
