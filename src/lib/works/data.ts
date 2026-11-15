import type { Work, WorkAsset } from "./types";

/**
 * Interim content store.
 *
 * While the admin panel and Supabase are being built, works read from this
 * array. Every consumer goes through the helpers in `./index.ts`, so swapping
 * this file for a database query later is a one-file change.
 *
 * Assets are generated from the PDFs in `SampleAds/` by
 * `tools/build-works-assets.mjs` into `public/works/<slug>/`. Width/height are
 * the real rendered dimensions, so cards never shift while loading.
 */

type PieceSpec = {
  /** File name inside `/public/works/<slug>/` (without extension). */
  name: string;
  caption?: string;
  width: number;
  height: number;
};

/** Builds the image assets of one work; the first piece doubles as its cover. */
function pieces(slug: string, file: "webp" | "png", list: PieceSpec[]): WorkAsset[] {
  return list.map((piece) => ({
    src: `/works/${slug}/${piece.name}.${file}`,
    type: "image" as const,
    caption: piece.caption,
    width: piece.width,
    height: piece.height,
  }));
}

export const works: Work[] = [
  {
    slug: "shikma",
    title: "שיקמה — קמפיין מיתוג",
    client: "מרכז שיקמה",
    category: "מיתוג וטיפול",
    type: "branding",
    summary:
      "תהליך מיתוג מלא סביב שם שנבחר מהעצים: טיזרים מעולם הצומח, מודעות השראה, ותשובה שמעמידה מרכז טיפולי יציב.",
    story:
      "הקמפיין נולד מהצורך של הרב ציטרנבוים — יועץ חינוכי ומטפל רגשי ותיק — לצאת אל קהל חדש. בתהליך המיתוג בחרנו את השם \"שיקמה\", ממשפחת העצים, וממנו נגזרה שפה שלמה: מודעות עם משפטים מעוררי השראה מעולם הצומח, בהם דו-משמעות לעולמם של ילדים ומתבגרים, עד לתשובה שאספה את הכל למקום יציב ומקצועי — מרכז שיקמה.",
    pieceLabels: ["טיזר 1", "טיזר 2", "טיזר 3", "מודעת התשובה"],
    assets: pieces("shikma", "webp", [
      { name: "teaser-1", caption: "טיזר 1", width: 1061, height: 1500 },
      { name: "teaser-2", caption: "טיזר 2", width: 1061, height: 1500 },
      { name: "teaser-3", caption: "טיזר 3", width: 958, height: 1500 },
      { name: "answer", caption: "מודעת התשובה", width: 958, height: 1500 },
    ]),
    order: 10,
    published: true,
  },
  {
    slug: "grimwald",
    title: "גרינוולד — טיזרים ומודעה",
    client: "גרינוולד",
    category: "מודעות",
    type: "teaser",
    summary:
      "רצף של שלושה טיזרים שמובילים למודעה אחת מדויקת — בקצב שנבנה שלב אחר שלב.",
    pieceLabels: ["טיזר 1", "טיזר 2", "טיזר 3", "מודעה"],
    assets: pieces("grimwald", "webp", [
      { name: "teaser-1", caption: "טיזר 1", width: 1061, height: 1500 },
      { name: "teaser-2", caption: "טיזר 2", width: 1061, height: 1500 },
      { name: "teaser-3", caption: "טיזר 3", width: 1061, height: 1500 },
      { name: "ad", caption: "מודעה", width: 1061, height: 1500 },
    ]),
    order: 20,
    published: true,
  },
  {
    slug: "papito",
    title: "פפיטו — סדרת מודעות",
    client: "פפיטו",
    category: "מודעות מוצר",
    type: "single-ad",
    summary: "סדרת מודעות נקייה ומדויקת, עם שפה אחידה שהפכה לזיכרון חזותי של המותג.",
    assets: pieces("papito", "webp", [
      { name: "ad-1", width: 958, height: 1500 },
      { name: "ad-2", width: 958, height: 1500 },
      { name: "ad-3", width: 958, height: 1500 },
    ]),
    order: 30,
    published: true,
  },
  {
    slug: "trail-jw-marriott",
    title: "רייזורט לייק — JW Marriott",
    client: "רייזורט לייק",
    category: "תיירות ונופש",
    type: "single-ad",
    summary:
      "ארבע מודעות עונתיות שמציגות את הרייזורט דרך האווירה — מים, אור, ושקט.",
    assets: pieces("trail", "webp", [
      { name: "cover", width: 464, height: 655 },
      { name: "ad-1", width: 460, height: 655 },
      { name: "ad-2", width: 460, height: 656 },
      { name: "ad-3", width: 461, height: 656 },
    ]),
    order: 40,
    published: true,
  },
  {
    slug: "rd-branding",
    title: "RD — מצגת מיתוג",
    client: "RD",
    category: "מיתוג",
    type: "branding",
    summary: "מצגת מיתוג מלאה: אסטרטגיה, שפת עיצוב, ויישום על כל נכסי המותג.",
    assets: [
      { src: "/works/rd/cover.webp", type: "image", width: 1500, height: 1061 },
      { src: "/works/rd/presentation.pdf", type: "pdf", caption: "המצגת המלאה" },
    ],
    order: 50,
    published: true,
  },
  {
    slug: "tarbut-toranit-2018",
    title: "חוברת קיץ — תרבות תורנית",
    client: "תרבות תורנית",
    category: "תרבות תורנית",
    type: "brochure",
    summary: "חוברת אירועים עונתית, עם היררכיה ברורה שמזמינה לרוץ על כל העמודים.",
    assets: [
      { src: "/works/tarbut/cover.webp", type: "image", width: 1061, height: 1500 },
      { src: "/works/tarbut/brochure.pdf", type: "pdf", caption: "החוברת המלאה" },
    ],
    order: 60,
    published: true,
  },
  {
    slug: "marmula",
    title: "מרמולה",
    client: "מרמולה",
    category: "מודעות",
    type: "single-ad",
    summary: "מודעה בודדת עם נוכחות חזקה — שמצליחה להעביר מסר שלם בשנייה אחת.",
    assets: pieces("marmula", "webp", [{ name: "ad", width: 958, height: 1500 }]),
    order: 70,
    published: true,
  },
  {
    slug: "alpergard",
    title: "אלפרגרד — מודעה",
    client: "אלפרגרד",
    category: "נדל״ן",
    type: "single-ad",
    summary: "מודעה לפרויקט נדל״ן, עם ניסוח מדויק והיררכיה שמבהירה את ההצעה.",
    assets: pieces("alpergard", "webp", [{ name: "ad", width: 1048, height: 1500 }]),
    order: 80,
    published: true,
  },
  {
    slug: "lobby-apartments",
    title: "לובי דירות",
    client: "לובי דירות",
    category: "נדל״ן",
    type: "single-ad",
    summary: "מודעה לפרויקט מגורים, עם שפה שקטה שמדברת על איכות חיים.",
    assets: pieces("lobby", "webp", [{ name: "ad", width: 1061, height: 1500 }]),
    order: 90,
    published: true,
  },
  {
    slug: "tama",
    title: "תמא",
    client: "תמא",
    category: "מיתוג",
    type: "teaser",
    summary: "טיזר ומודעה שנבנו יחד — שפת מותג נקייה שמחברת בין הזהות לבין השטח.",
    pieceLabels: ["טיזר", "מודעה"],
    assets: pieces("tama", "webp", [
      { name: "teaser", caption: "טיזר", width: 1061, height: 1500 },
      { name: "ad", caption: "מודעה", width: 1061, height: 1500 },
    ]),
    order: 100,
    published: true,
  },
];
