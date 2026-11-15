import type { WorkType } from "@/content/types";

/**
 * The editable shape of a work, shared by the admin forms and the database
 * layer. Deliberately flat (no nested asset array) so it maps 1:1 to a form.
 */

type DraftAsset = {
  src: string;
  type: "image" | "pdf";
  caption?: string;
  width?: number;
  height?: number;
  /** PDFs: the rendered pages' sizes, set on upload. */
  pages?: { width: number; height: number }[];
};

export type WorkDraft = {
  id?: string;
  slug: string;
  title: string;
  client: string;
  category: string;
  type: WorkType;
  summary: string;
  story: string;
  year: string;
  published: boolean;
  /** Lower numbers come first. */
  order: number;
  /** Image/PDF assets in display order. The first image is the cover. */
  assets: DraftAsset[];
};

export const workTypeOptions: { value: WorkType; label: string }[] = [
  { value: "single-ad", label: "מודעה בודדת" },
  { value: "teaser", label: "טיזרים ומודעה" },
  { value: "branding", label: "מצגת מיתוג" },
  { value: "brochure", label: "חוברת" },
];

export function emptyDraft(order = 100): WorkDraft {
  return {
    slug: "",
    title: "",
    client: "",
    category: "",
    type: "single-ad",
    summary: "",
    story: "",
    year: "",
    published: true,
    order,
    assets: [],
  };
}

/**
 * Letters (Latin or Hebrew), digits and hyphens only.
 *
 * The final letters (ם ן ף ץ ך) are listed apart: they sit outside א–ת, and
 * without them a perfectly ordinary Hebrew address such as "שלום" was refused.
 */
const SLUG_RE = /^[a-z0-9א-תךםןףץ-]+$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}
