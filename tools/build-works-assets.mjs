/**
 * Turns everything in `SampleAds/` into ready-to-serve images.
 *
 *   node tools/build-works-assets.mjs
 *
 * What it produces, under `public/works/`:
 *   * `<slug>/<piece>.webp`   — every ad and teaser (PDF page or source image)
 *   * `<slug>/<piece>.jpg`    — OG image, only for the cover of a work
 *   * `<slug>/presentation.pdf` — a lighter download copy of a `מצגת`
 *
 * `src/lib/works/generated.ts` is regenerated at the end and is what the site
 * reads. Nothing inside `public/works/` is deleted here — running this again
 * after adding ads only fills in what is missing. (The folders in `public/works/`
 * are wiped between full rebuilds by hand, not by this tool.)
 *
 * Requires mupdf (WASM renderer) + sharp, both dev-only.
 */
import mupdf from "mupdf";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { writeFile, mkdir, readFile, copyFile } from "node:fs/promises";
import path from "node:path";
import {
  SAMPLE_DIR,
  latinSlug,
  pieceLabel,
  pieceSlug,
  scanSampleAds,
} from "./works-source.mjs";

const ROOT = process.cwd();
const SAMPLE = path.join(ROOT, SAMPLE_DIR);
const OUT = path.join(ROOT, "public", "works");
const SEED = path.join(ROOT, "src", "lib", "works", "generated.ts");

/** Longest side of a rendered page. Big enough for lightbox, small enough to load fast. */
const MAX_SIDE = 1500;
const WEBP_QUALITY = 86;

/* ── Slugs and wording ───────────────────────────────────────────────────── */

/** Folder name → site slug. Everything else gets a readable Latin slug. */
const SLUGS = {
  "04": "zero-four",
  "אקרו": "akro",
  "שדרת טי": "sderot-t",
  "קלקטה": "kolekta",
  "לובי": "lobby",
  "גני טל": "ganei-tal",
  "יעקובוביץ": "yekubovich",
  "מרמולה": "marmola",
  "פפיטו": "papito",
  "שיקמה": "shikma",
  "גרינוולד": "grimwald",
  "טרייל": "trail",
  "כאילו": "keilu",
  "קיץ מאוגדים": "kayitz-meugadim",
  "שומשום": "shumshum",
  "סרוויס": "service",
  "וינריך": "winrich",
  "יהודית ליפל פאנית": "yehudit-lipel",
  "טובה גרשטנקורן": "tova-gershtenkor",
  "אשדוד על גלגלים": "ashdod-al-galgalim",
  "ל\"כ סליו / כ\"ו כסלו": "chodesh-kislev",
  "מצגת מיתוג RD": "rd-branding",
  RD: "rd",
};

/** Known clients keep their formal name, whatever the folder is called. */
const CLIENTS = {
  "04": "04",
  "אקרו": "אקרו",
  "שדרת טי": "שדרת טי",
  "קלקטה": "קלקטה",
  "לובי": "לובי",

  "גני טל": "גני טל",
  "יעקובוביץ": "יעקובוביץ",
  "כאילו": "כאילו",
  "קיץ מאוגדים": "קיץ מאוגדים",
  "שומשום": "שומשום",
  "סרוויס": "סרוויס",
  "וינריך": "וינריך",
  "יהודית ליפל פאנית": "יהודית ליפל",
  "טובה גרשטנקורן": "טובה גרשטנקורן",
  "אשדוד על גלגלים": 'מאוגדים — "אשדוד על גלגלים"',
  "ל\"כ סליו / כ\"ו כסלו": "גני טל — קמפיין חנוכה",
  "מצגת מיתוג RD": "מתחם RD",
  "מרמולה": "מרמולה",
  "פפיטו": "פפיטו",
  "שיקמה": "מרכז שיקמה",
  "גרינוולד": "גרינוולד",
  "טרייל": "טרייל",
  RD: "מתחם RD",
};

/** Folder name → the category shown on the card and the detail page. */
const CATEGORIES = {
  "04": "מיתוג",
  "אקרו": "ספורט ופנאי",
  "שדרת טי": "מרכזי מסחר",
  "קלקטה": "אופנה",
  "לובי": 'נדל"ן',
  "גני טל": "מרכזי מסחר",
  "לובי דירות": 'נדל"ן',
  "יעקובוביץ": "אופנה",
  "מרמולה": "אופנה",
  "פפיטו": "אופנה",
  "שיקמה": "מיתוג וטיפול",
  "גרינוולד": "מודעות",
  "כאילו": "אופנה",
  "קיץ מאוגדים": "אירועים",
  "שומשום": "מודעות",
  "סרוויס": "מודעות",
  "וינריך": "פיננסים",
  "יהודית ליפל פאנית": "אופנה",
  "טובה גרשטנקורן": "אופנה",
  "אשדוד על גלגלים": "אירועים",
  "ל\"כ סליו / כ\"ו כסלו": "מרכזי מסחר",
  "מצגת מיתוג RD": "מיתוג",
  "טרייל": "נדל\"ן",
  RD: "מרכזי מסחר",
  [path.basename(".", ".")]: "מודעות",
};

/**
 * Hand-written copy for campaigns whose story we know. Anything not listed
 * gets a neutral line built from its pieces, and the owner can rewrite it in
 * the admin area.
 */
const COPY = {
  "04": {
    title: "04 — מיתוג וקמפיין פתיחה",
    category: "מיתוג",
    summary:
      "שפה שלמה של טיזרים ומודעה: 04 חדש, על לבן ועל רקע — אותו רעיון, בכל שלב של הקמפיין.",
    year: "2025",
  },
  "אקרו": {
    title: "אקרו — מיתוג וקמפיין לחדר כושר",
    category: "ספורט ופנאי",
    summary:
      "סדרת טיזרים ומודעה לחדר הכושר החדש: שלב אחרי שלב, מהרמז הראשון ועד החשיפה.",
    year: "2025",
  },
  "שדרת טי": {
    title: "שדרת טי — קמפיין לחנוכה",
    category: "מרכזי מסחר",
    summary:
      "טיזרים, מודעות וקמפיין חג: קול עונתי אחד לשדרת המסחר, מההכנות עד ימי החג.",
    year: "2025",
  },
  "קלקטה": {
    title: "קלקטה — קולקציית קיץ",
    category: "אופנה",
    summary: "סדרת מודעות לקולקציית הקיץ: מבחר, אור וקו נקי — אותו מותג, בכל מודעה.",
    year: "2024",
  },
  "וינריך": {
    title: "וינריך — מודעה",
    category: "פיננסים",
    summary: "מודעה לוינריך — משכנתאות, בקו נקי וברור.",
    year: "2024",
  },
  "לובי": {
    title: "לובי — קמפיין לפרויקט מגורים",
    category: 'נדל"ן',
    summary:
      "טיזרים ומודעה לפרויקט מגורים: מהרמז הראשון על הדירה ועד המודעה שחושפת את המיקום.",
    year: "2025",
  },
  RD: {
    title: "RD — מתחם מסחרי בערד",
    category: "מרכזי מסחר",
    summary:
      "שפת פרסום שלמה למתחם המסחרי שבערד: טיזרים, ירידים עונתיים, מבצעי חנויות וקמפיין פתיחה — כולם יחד, בקול אחד.",
    story:
      "מתחם RD הוא לב הקניות של ערד. העבודה עם המתחם נמשכת לאורך כל השנה: טיזרים שמלהיבים לפני יריד, משפטים קצרים שמסמנים את העונה, ומודעות שמביאות את הקהל אל החנויות. בכל קמפיין בחרנו רגש אחד — סקרנות, שמחה של חג, או פשוט הנאה מקנייה — והעלינו אותו צעד אחד מעל הרעש של סביבת הקניות.",
    year: "2026",
  },
  "יעקובוביץ": {
    title: "יעקובוביץ — אופנה לאורך כל העונות",
    category: "אופנה",
    summary:
      "קולקציות חורף, אביב וקיץ, מבצעים והזמנות אישיות — שפת פרסום נקייה שמלווה את החנויות של יעקובוביץ לאורך השנה.",
    story:
      "יעקובוביץ הוא מותג אופנה עם כמה סניפים, ולכל עונה יש לו סיפור אחר. תפקידנו היה לתת לכל קולקציה את האווירה שלה — איטליה של החורף, אור של אביב — ועדיין לשמור על שפה אחת מזוהה, בלוגו, בטיפוגרפיה ובקומפוזיציה.",
    year: "2026",
  },
  "מרמולה": {
    title: "מרמולה — מיתוג וקמפיינים לבייבי",
    category: "אופנה",
    summary:
      "מתהליך מיתוג מלא לחנות בוטיק לתינוקות — רעיון, לוגו, שפה עיצובית, וקמפיינים עונתיים לאורך השנה.",
    story:
      "מרמולה החלה כחנות בוטיק לתינוקות, ובתהליך המיתוג בנינו לה זהות שלמה: שם, לוגו, פלטת גוונים ושפה עיצובית שנשמרת בכל מודעה — מהפתיחה ועד קולקציות החורף והאביב. בשפת העיצוב בחרנו רכות וחום, בלי ליפול למתוק מדי, כדי שהחנות תרגיש יוקרתית ומדויקת.",
    year: "2026",
  },
  "פפיטו": {
    title: "פפיטו — מודעות לחנויות ילדים",
    category: "אופנה",
    summary:
      "מבחר מודעות לחנות ילדים ותינוקות, ולחנויות נוספות בשדרת המסחר — שפה צבעונית, שמחה, ובלי עומס.",
    year: "2025",
  },
  "גני טל": {
    title: "גני טל — ים של אפשרויות",
    category: "מרכזי מסחר",
    summary:
      "קמפיין פתיחה למרכז המסחר החדש של גני טל באשדוד: טיזרים שיוצרים ציפייה, ומודעות שמביאות את הקהל אל הדלת.",
    story:
      "המרכז של גני טל נולד באשדוד, ולווה בקמפיין פתיחה שנועד להציג אותו לעיר. בחרנו מטפורה אחת — הים שגרה עליו אשדוד — והלבשנו כל אופציה של מרכז קניות על אותו הים: \"ים של אפשרויות\", \"ים של השראות\", \"ים של הזדמנויות\". ככה הציבור מכיר את השם עוד לפני שהחנות הראשונה נפתחת.",
    year: "2026",
  },
  "שיקמה": {
    title: "שיקמה — קמפיין מיתוג",
    category: "מיתוג וטיפול",
    summary:
      "תהליך מיתוג מלא סביב שם שנבחר מהעצים: טיזרים מעולם הצומח, מודעות השראה, ותשובה שמעמידה מרכז טיפולי יציב.",
    story:
      "הקמפיין נולד מהצורך של הרב ציטרנבוים — יועץ חינוכי ומטפל רגשי ותיק — לצאת אל קהל חדש. בתהליך המיתוג בחרנו את השם \"שיקמה\", ממשפחת העצים, וממנו נגזרה שפה שלמה: מודעות עם משפטים מעוררי השראה מעולם הצומח, בהם דו-משמעות לעולמם של ילדים ומתבגרים, עד לתשובה שאספה את הכל למקום יציב ומקצועי — מרכז שיקמה.",
    year: "2026",
  },
  "גרינוולד": {
    title: "גרינוולד — טיזרים ומודעה",
    category: "מודעות",
    summary:
      "קמפיין בשלבים: שלושה טיזרים שמותחים את הקהל, ומודעה שחושפת את הפנים.",
    year: "2025",
  },
  "טרייל": {
    title: "טרייל — רייזורט JW Marriott",
    category: "נדל\"ן",
    summary: "קו מודעות לפרויקט הדירות של רייזורט JW Marriott — צילום נקי, שקט יוקרתי.",
    year: "2025",
  },
  "כאילו": {
    title: "כאילו — מיתוג וקמפיין",
    category: "אופנה",
    summary: "טיזר ומודעות לאורך הקמפיין — רעיון אחד שמלווה את המותג בכל שלב.",
    year: "2024",
  },
  "קיץ מאוגדים": {
    title: "מאוגדים — קיץ",
    category: "אירועים",
    summary:
      "טיזרים ומודעה לקמפיין הקיץ: סדרת רמזים שמכניסה אווירה, ומודעה שסוגרת את הקמפיין.",
    year: "2024",
  },
  "שומשום": {
    title: "שומשום — מודעות",
    category: "מודעות",
    summary: "סדרת מודעות למותג שומשום — שפה נקייה שמובילה אל המוצר.",
    year: "2024",
  },
  "סרוויס": {
    title: "סרוויס — מיתוג וקמפיין",
    category: "מודעות",
    summary: "טיזר ומודעה: שלב הבנייה, ואחריו החשיפה המלאה של המותג.",
    year: "2025",
  },
  "יהודית ליפל פאנית": {
    title: "יהודית ליפל — פאנית",
    category: "אופנה",
    summary: "טיזר ומודעה לחנות הפאות של יהודית ליפל — הסתרה, ואחריה הזמנה לקהל.",
    year: "2025",
  },
  "טובה גרשטנקורן": {
    title: "טובה גרשטנקורן — מודעות",
    category: "אופנה",
    summary: "סדרת מודעות — שפה אחידה לאורך הקמפיין.",
    year: "2025",
  },
  "אשדוד על גלגלים": {
    title: 'מאוגדים — "אשדוד על גלגלים"',
    category: "אירועים",
    summary: "חוברת אירוע עירוני גדול — יותר מארבעים עמודים של תוכן, הופעות ואירועים.",
    year: "2025",
  },
  "ל\"כ סליו / כ\"ו כסלו": {
    title: "גני טל — חנוכה של זכיות",
    category: "מרכזי מסחר",
    summary: "חוברת קמפיין לחנוכה של שדרת המסחר בגני טל — מבצעים, הטבות והגרלה.",
    year: "2024",
  },
  "מצגת מיתוג RD": {
    title: "מתחם RD — מצגת המיתוג",
    category: "מיתוג",
    summary:
      "מצגת המיתוג של מתחם RD — הלוגו, צבעי המותג והשפה העיצובית, שלב אחרי שלב.",
    year: "2026",
  },
};

/**
 * What the site says about a single ad whose file name is only a client or a
 * product — keyed by the file name without its extension.
 *
 *   client   the name shown above the title
 *   title    the line the visitor reads
 *   category the field it belongs to (the gallery filters on it)
 *
 * Anything missing falls back to the file name.
 */
const SINGLE_COPY = {
  קלינקום: { title: "קלינקום — מודעה", client: "קלינקום", category: "מודעות" },
  שמלמלה: { title: "שמלמלה — מודעה", client: "שמלמלה", category: "אופנה" },
  "שולמית שחור": { title: "שולמית שחור — מודעה", client: "שולמית שחור", category: "מודעות" },
  וואטר: { title: "וואטר — מודעה", client: "וואטר", category: "מודעות" },
  "לובי דירות": {
    title: "לובי דירות — מודעה לפרויקט מגורים",
    client: "לובי דירות",
    category: 'נדל"ן',
  },
  "קולקציית קיץ": { title: "קלקטה — קולקציית קיץ", client: "קלקטה", category: "אופנה" },
  אומברה: { title: "אומברה — מודעה", client: "אומברה", category: "אופנה" },
  אייזן: { title: "אייזן — עיצוב פנים", client: "אייזן", category: "עיצוב פנים" },
  "גיטי וויס פאות": { title: "גיטי וויס — פאות", client: "גיטי וויס", category: "אופנה" },
  "התעמלות סברסקי סטודיו": {
    title: "התעמלות סברסקי — סטודיו",
    client: "התעמלות סברסקי",
    category: "ספורט ופנאי",
  },
  וינריך: { title: "וינריך — מודעה", client: "וינריך", category: "מודעות" },
  אלפרגרד: { title: "אלפרגרד — מודעה", client: "אלפרגרד", category: "מודעות" },
  לאהלה: { title: "לאהלה — מודעה", client: "לאהלה", category: "מודעות" },
  "משכנתאות גרינבוים": {
    title: "גרינבוים — משכנתאות",
    client: "גרינבוים",
    category: "פיננסים",
  },
  "נופש נשים": { title: "נופש נשים — מודעה", client: "נופש נשים", category: "נופש" },
  סרוויס: { title: "סרוויס — מודעה", client: "סרוויס", category: "מודעות" },
  "צלסי בגדי ילדים": { title: "צלסי — בגדי ילדים", client: "צלסי", category: "אופנה" },
  קולרדו: { title: "קולרדו — מודעה", client: "קולרדו", category: "מודעות" },
  "נחמי וואטר 2": { title: "נחמי וואטר — מודעה", client: "נחמי וואטר", category: "מודעות" },
  "פאטיו מודעה": { title: "פאטיו — מודעה", client: "פאטיו", category: "מודעות" },
  יהודית: { title: "יהודית — מודעה", client: "יהודית", category: "מודעות" },
};

/** A neutral title for a single ad nobody has described yet. */
function neutralTitle(label) {
  return label
    .replace(/^מודעה\s*/, "")
    .replace(/\s*\bcopy\b\s*/i, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function neutralSummary(count) {
  return count > 1
    ? `סדרת מודעות — ${count} פריטים שמוצגים יחד, לפי סדר הקמפיין.`
    : "מודעה בודדת מתוך העבודות שלנו.";
}

/* ── Rendering ───────────────────────────────────────────────────────────── */

function isPdf(file) {
  return /\.pdf$/i.test(file);
}

/** Renders one page of a PDF at screen resolution. */
async function renderPdfPage(srcPath, pageIndex = 0) {
  const buffer = await readFile(srcPath);
  const doc = mupdf.Document.openDocument(buffer, "application/pdf");
  const page = doc.loadPage(pageIndex);
  const [x0, y0, x1, y1] = page.getBounds();
  const longest = Math.max(x1 - x0, y1 - y0);
  const scale = MAX_SIDE / longest;
  const pixmap = page.toPixmap(
    mupdf.Matrix.scale(scale, scale),
    mupdf.ColorSpace.DeviceRGB,
    false,
    true,
  );
  return { png: pixmap.asPNG(), width: pixmap.getWidth(), height: pixmap.getHeight() };
}

/** How many pages a PDF has — a one-page ad and a 36-page deck differ. */
async function pdfPageCount(srcPath) {
  const doc = mupdf.Document.openDocument(await readFile(srcPath), "application/pdf");
  return doc.countPages();
}

/** Renders every page at a download-friendly resolution into a new, small PDF. */
async function buildCompactPdf(srcPath, targetPath) {
  const doc = mupdf.Document.openDocument(await readFile(srcPath), "application/pdf");
  const out = await PDFDocument.create();
  const count = doc.countPages();

  for (let i = 0; i < count; i += 1) {
    const page = doc.loadPage(i);
    const [x0, y0, x1, y1] = page.getBounds();
    const pageWidth = x1 - x0;
    const pageHeight = y1 - y0;
    const scale = 1100 / Math.max(pageWidth, pageHeight);
    const pixmap = page.toPixmap(
      mupdf.Matrix.scale(scale, scale),
      mupdf.ColorSpace.DeviceRGB,
      false,
      true,
    );
    const jpeg = await sharp(pixmap.asPNG()).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
    const image = await out.embedJpg(jpeg);
    const pdfPage = out.addPage([pageWidth, pageHeight]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  }

  await writeFile(targetPath, await out.save({ useObjectStreams: true }));
}

/** One image, whichever way it came in, as WebP, capped to MAX_SIDE. */
async function writeWebp(input, target) {
  // Loaded first and resized after: `resize()` is ignored on animated images,
  // which is how the two large source photos came in.
  const image = await sharp(input).rotate(); // honour the camera orientation flag
  const { width = 0, height = 0 } = await image.metadata();
  if (Math.max(width, height) > MAX_SIDE) {
    image.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
  }
  return image.webp({ quality: WEBP_QUALITY }).toFile(target);
}

/** The share image for social previews — JPEG, because not every crawler reads WebP. */
async function writeOgJpg(source, target) {
  // Padded to 4:5 on the site background, so tall posters are not stretched.
  await sharp(source)
    .resize(1200, 1600, { fit: "contain", background: "#0b0b0c" })
    .jpeg({ quality: 82 })
    .toFile(target);
}

/* ── Seed file ───────────────────────────────────────────────────────────── */

function slugFor(dir) {
  if (SLUGS[dir]) return SLUGS[dir];
  // Unknown folder: keep the Hebrew name in a URL-safe, stable form.
  return `work-${Buffer.from(dir, "utf8").toString("hex").slice(0, 12)}`;
}

function slugForSingle(label, used) {
  const base = latinSlug(label, `ad-${used.size + 1}`);
  let slug = base;
  let n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const { campaigns, singles, brochures } = await scanSampleAds(ROOT);
  const usedSlugs = new Set();
  const works = [];
  let order = 10;

  for (const entry of campaigns) {
    const slug = slugFor(entry.dir);
    usedSlugs.add(slug);
    const dir = path.join(OUT, slug);
    await mkdir(dir, { recursive: true });

    const assets = [];
    const usedNames = new Set();
    for (const [index, file] of entry.pieces.entries()) {
      const src = path.join(SAMPLE, entry.dir, file);
      // Two files can share a number ("מודעה 2" and "מועדה 2.pdf"); keep both.
      const base = pieceSlug(file, index);
      let name = base;
      let n = 2;
      while (usedNames.has(name)) name = `${base}-${n++}`;
      usedNames.add(name);
      let pngOrImage = src;
      if (isPdf(file)) {
        if ((await pdfPageCount(src)) > 1) {
          console.warn(`⚠ ${entry.dir}/${file}: יש ${await pdfPageCount(src)} עמודים — מוצג העמוד הראשון`);
        }
        pngOrImage = (await renderPdfPage(src)).png;
      }
      const target = path.join(dir, `${name}.webp`);
      const info = await writeWebp(pngOrImage, target);
      assets.push({
        src: `/works/${slug}/${name}.webp`,
        type: "image",
        caption: pieceLabel(file),
        width: info.width,
        height: info.height,
      });
      console.log(`${slug}/${name}.webp`, `${info.width}x${info.height}`);
    }

    // Link-preview picture, made from the first rendered piece.
    await writeOgJpg(path.join(OUT, assets[0].src.replace(/^\/works\//, "")), path.join(dir, "og.jpg"));

    if (entry.presentation) {
      const { basename, extname } = path.parse(entry.presentation);
      const target = path.join(dir, "presentation.pdf");
      await buildCompactPdf(path.join(SAMPLE, entry.dir, entry.presentation), target);
      // A legacy folder PDF carries only the client's name; call it a presentation.
      assets.push({
        src: `/works/${slug}/presentation.pdf`,
        type: "pdf",
        caption: /^מצגת/.test(basename) ? pieceLabel(entry.presentation) : "מצגת המיתוג",
      });
      console.log(`${slug}/presentation.pdf`);
    }

    const copy = COPY[entry.dir] ?? {};
    const hasTeaser = entry.pieces.some((f) => /^טיזר/.test(f));
    works.push({
      slug,
      title: copy.title ?? `${CLIENTS[entry.dir] ?? entry.dir} — ${entry.label}`,
      client: CLIENTS[entry.dir] ?? entry.dir,
      category: copy.category ?? CATEGORIES[entry.dir] ?? "מודעות",
      // Has a downloadable deck → branding; ads after teasers → teaser series.
      type: entry.presentation ? "branding" : hasTeaser ? "teaser" : "single-ad",
      summary: copy.summary ?? neutralSummary(assets.length),
      story: copy.story,
      year: copy.year,
      order,
      published: true,
      assets,
    });
    order += 10;
  }

  /**
   * Single ads go after the campaigns, newest folder contents last, so the
   * gallery opens with the bigger stories and settles into the one-offs.
   */
  for (const entry of singles) {
    const slug = slugForSingle(entry.label, usedSlugs);
    usedSlugs.add(slug);
    const dir = path.join(OUT, slug);
    await mkdir(dir, { recursive: true });

    const src = path.join(SAMPLE, entry.dir === SAMPLE_DIR ? "" : entry.dir, entry.pieces[0]);
    let pngOrImage = src;
    if (isPdf(entry.pieces[0])) pngOrImage = (await renderPdfPage(src)).png;
    const target = path.join(dir, "ad.webp");
    const info = await writeWebp(pngOrImage, target);
    await writeOgJpg(target, path.join(dir, "og.jpg"));

    const single = SINGLE_COPY[entry.label] ?? {};
    const name = neutralTitle(entry.label);
    works.push({
      slug,
      title: single.title ?? name,
      client: single.client ?? name,
      category: single.category ?? "מודעות",
      type: "single-ad",
      summary: neutralSummary(1),
      order,
      published: true,
      assets: [
        {
          src: `/works/${slug}/ad.webp`,
          type: "image",
          caption: pieceLabel(entry.pieces[0]),
          width: info.width,
          height: info.height,
        },
      ],
    });
    console.log(`${slug}/ad.webp`, `${info.width}x${info.height}`);
    order += 10;
  }

  /**
   * Booklets last. Each file is one work of type `brochure`, so the gallery
   * shows them only under the "חוברות" filter. The cover is the first page
   * drawn in full — a booklet is usually tall, and a cropped cover would hide
   * the masthead.
   */
  for (const entry of brochures) {
    const slug = slugForSingle(entry.label, usedSlugs);
    usedSlugs.add(slug);
    const dir = path.join(OUT, slug);
    await mkdir(dir, { recursive: true });

    const src = path.join(SAMPLE, entry.dir, entry.pieces[0]);
    const { png, width, height } = await renderPdfPage(src);
    const pages = await pdfPageCount(src);
    const info = await writeWebp(png, path.join(dir, "cover.webp"));
    await writeOgJpg(path.join(dir, "cover.webp"), path.join(dir, "og.jpg"));

    const copy = COPY[entry.label] ?? {};
    works.push({
      slug,
      title: copy.title ?? `${entry.label} — חוברת`,
      client: CLIENTS[entry.label] ?? entry.label,
      category: copy.category ?? "חוברות",
      type: "brochure",
      summary: copy.summary ?? `חוברת בת ${pages} עמודים.`,
      story: copy.story,
      year: copy.year,
      order,
      published: true,
      assets: [
        {
          src: `/works/${slug}/cover.webp`,
          type: "image",
          caption: pieceLabel(entry.pieces[0]),
          width: info.width ?? width,
          height: info.height ?? height,
        },
        // The full booklet, served as uploaded — the visitor flips through it.
        { src: `/works/${slug}/presentation.pdf`, type: "pdf", caption: "החוברת המלאה" },
      ],
    });
    // Copy the original booklet into its own folder; the preview is page one.
    await copyFile(src, path.join(dir, "presentation.pdf"));
    console.log(`${slug}/cover.webp ${pages} pages`);
    order += 10;
  }

  await writeSeed(works);
  console.log(`\n✓ ${works.length} עבודות — src/lib/works/generated.ts`);
}

/** Writes the seed as TypeScript, so the site gets types and no JSON import tricks. */
async function writeSeed(works) {
  const body = works
    .map((work) => {
      const lines = [
        "  {",
        `    slug: ${JSON.stringify(work.slug)},`,
        `    title: ${JSON.stringify(work.title)},`,
        `    client: ${JSON.stringify(work.client)},`,
        `    category: ${JSON.stringify(work.category)},`,
        `    type: ${JSON.stringify(work.type)},`,
        `    summary: ${JSON.stringify(work.summary)},`,
      ];
      if (work.story) lines.push(`    story: ${JSON.stringify(work.story)},`);
      if (work.year) lines.push(`    year: ${JSON.stringify(work.year)},`);
      lines.push(`    order: ${work.order},`);
      lines.push("    published: true,");
      lines.push("    assets: [");
      for (const asset of work.assets) {
        // A PDF has no rendered size to record.
        const size = asset.width ? `, width: ${asset.width}, height: ${asset.height}` : "";
        lines.push(
          `      { src: ${JSON.stringify(asset.src)}, type: ${JSON.stringify(asset.type)}, caption: ${JSON.stringify(asset.caption)}${size} },`,
        );
      }
      lines.push("    ],");
      lines.push("  },");
      return lines.join("\n");
    })
    .join("\n");

  const file = `/* Generated by tools/build-works-assets.mjs — do not edit by hand.
   Mirrors what is inside SampleAds/; run the tool after adding or changing ads. */
import type { Work } from "./types";

export const generatedWorks: Work[] = [
${body}
];
`;
  await writeFile(SEED, file);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
