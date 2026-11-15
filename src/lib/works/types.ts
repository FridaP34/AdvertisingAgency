import type { WorkType } from "@/content/types";

export type WorkAsset = {
  /** Public URL of the image or PDF. */
  src: string;
  type: "image" | "pdf";
  /** Optional per-slide caption. */
  caption?: string;
  /** Natural dimensions, used to avoid layout shift. */
  width?: number;
  height?: number;
  /**
   * PDFs only: the file rendered page by page, so the booklet can be read
   * inside the page without a PDF viewer. A file uploaded through the admin is
   * rendered on upload; one that ships with the project is rendered by
   * `tools/render-brochure-pages.mjs`, with its sizes in the generated
   * manifest. See `src/lib/pdf/render.ts`.
   */
  pages?: { width: number; height: number }[];
  /**
   * Set when a file is uploaded in the form and not saved yet — the upload
   * carries its Storage path, which the form needs to delete it.
   */
  path?: string;
};

export type Work = {
  /** URL-safe identifier, used in `/works/[slug]`. */
  slug: string;
  title: string;
  /** Client name, e.g. "שיקמה". */
  client: string;
  /** e.g. "תרבות תורנית", "אדריכלות", "מודעות מוצר". */
  category: string;
  type: WorkType;
  /** Shown on the card. Keep to one or two short lines. */
  summary: string;
  /** Long-form story, only for multi-piece campaigns. */
  story?: string;
  /** Quick label for the campaign pieces, e.g. ["טיזר 1", "טיזר 2", "הודעה"]. */
  pieceLabels?: string[];
  /** Optional — when omitted, the first image asset is used as the cover. */
  cover?: WorkAsset;
  assets: WorkAsset[];
  /** Lower numbers come first. */
  order: number;
  published: boolean;
  year?: string;
};
