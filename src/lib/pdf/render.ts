// mupdf is an ESM package without a default export; each name is imported.
import { ColorSpace, Document, Matrix } from "mupdf";
import sharp from "sharp";

/**
 * Turns a PDF into page pictures.
 *
 * An ad that arrives as a PDF cannot be shown as it is: a browser PDF frame
 * depends on a viewer that is often missing in a filtered environment, and a
 * gallery tile needs a picture. So every page is rendered once, here, on the
 * server, and stored as WebP beside the file.
 *
 * The pages keep the folder convention — `<folder>/pages/page-NN.webp`, the
 * folder being the PDF's own — the same one the site reads for booklets, so a
 * PDF uploaded through the admin is read exactly like one that shipped with
 * the project. An upload's file name is unique, so each PDF gets its own
 * `pages` folder and two files in one work never write over each other.
 */

/** Height of one stored page, in pixels. Wider pages get a narrower one. */
const PAGE_W = Number(process.env.PAGE_W ?? 900);
/** A ceiling, so a very long file cannot fill the bucket. */
const MAX_PAGES = 160;

export type RenderedPage = { index: number; buffer: Buffer; width: number; height: number };

/**
 * `folder` is where the PDF's pages live — `pdfPagesFolder("<slug>/<file>.pdf")`.
 */
export function pagePath(folder: string, index: number): string {
  return `${folder}/page-${String(index).padStart(2, "0")}.webp`;
}

/** The `pages` folder beside a PDF: `<folder>/pages` for `<folder>/<file>.pdf`. */
export function pdfPagesFolder(pdfPath: string): string {
  return `${pdfPath.slice(0, pdfPath.lastIndexOf("/"))}/pages`;
}

/** Storage objects that hold a booklet's pages, page 1 … page `count`. */
export function pagePaths(folder: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => pagePath(folder, i + 1));
}

export function pageCount(pdf: Buffer): number {
  return Document.openDocument(pdf, "application/pdf").countPages();
}

export async function renderPdfPages(pdf: Buffer, limit = MAX_PAGES): Promise<RenderedPage[]> {
  const doc = Document.openDocument(pdf, "application/pdf");
  const count = Math.min(doc.countPages(), limit);
  const pages: RenderedPage[] = [];

  for (let i = 0; i < count; i += 1) {
    const page = doc.loadPage(i);
    const [x0, y0, x1, y1] = page.getBounds();
    const longest = Math.max(x1 - x0, y1 - y0) || 1;
    // A little over the served width, so text stays crisp on a retina screen.
    const scale = (PAGE_W * 1.35) / longest;
    // mupdf's draw limit is 16 million pixels a page; stay under it.
    if ((x1 - x0) * scale * (y1 - y0) * scale > 15_000_000) continue;
    const pixmap = page.toPixmap(Matrix.scale(scale, scale), ColorSpace.DeviceRGB, false, true);
    const buffer = await sharp(pixmap.asPNG())
      .resize({ width: PAGE_W, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const meta = await sharp(buffer).metadata();
    pages.push({ index: i + 1, buffer, width: meta.width ?? PAGE_W, height: meta.height ?? PAGE_W });
  }

  return pages;
}
