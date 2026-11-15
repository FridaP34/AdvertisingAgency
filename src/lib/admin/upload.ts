import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Uploads one file to the public `works` bucket and returns its public URL
 * plus the image's natural size (used to prevent layout shift on the site).
 */

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
/** The PDF ceiling — the same one `/admin/api/pdf` enforces on the server. */
export const MAX_PDF_BYTES = 24 * 1024 * 1024;

const ACCEPTED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export type UploadedAsset = {
  src: string;
  type: "image" | "pdf";
  width?: number;
  height?: number;
  /** Storage object path, kept so the file can be deleted later. */
  path: string;
  /** PDFs: the rendered pages, and how many there are. */
  pages?: { width: number; height: number }[];
  pageCount?: number;
};

async function measureImage(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

function safeName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

export async function uploadAsset(file: File, slug: string): Promise<UploadedAsset> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  // A PDF gets its own, larger ceiling: it goes through `/admin/api/pdf` and
  // is never stored as an image, so the picture limit below does not apply.
  if (isPdf && file.size > MAX_PDF_BYTES) {
    throw new Error(`"${file.name}" גדול מ־24MB. יש להקטין אותו לפני ההעלאה.`);
  }
  if (!isPdf && file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`"${file.name}" גדול מ־8MB. יש להקטין אותו לפני ההעלאה.`);
  }

  if (!isPdf && !ACCEPTED_IMAGE.includes(file.type)) {
    throw new Error(`סוג הקובץ "${file.type || file.name}" אינו נתמך. אפשר להעלות תמונות או PDF.`);
  }

  // A PDF is uploaded through the server, which renders its pages to pictures
  // as part of the upload — so the work has something to show, not just a file.
  if (isPdf) return uploadPdf(file, slug);

  const supabase = createSupabaseBrowserClient();
  const path = `${slug}/${Date.now()}-${safeName(file.name)}`;

  const { error } = await supabase.storage
    .from("works")
    .upload(path, file, { cacheControl: "31536000", contentType: file.type, upsert: false });

  if (error) {
    throw new Error(`העלאת "${file.name}" נכשלה`);
  }

  const { data } = supabase.storage.from("works").getPublicUrl(path);
  const size = await measureImage(file);

  return { src: data.publicUrl, type: "image", ...size, path };
}

type PdfUpload = {
  src: string;
  path: string;
  /** First page's size — the picture a tile can show for the file. */
  width: number;
  height: number;
  pageCount: number;
  pages: { width: number; height: number }[];
};

/** Uploads a PDF and waits for its pages to be rendered (`/admin/api/pdf`). */
async function uploadPdf(file: File, slug: string): Promise<UploadedAsset> {
  const form = new FormData();
  form.append("file", file);
  form.append("slug", slug);

  let response: Response;
  try {
    response = await fetch("/admin/api/pdf", { method: "POST", body: form });
  } catch {
    throw new Error(`העלאת "${file.name}" נכשלה — החיבור הופרע. נסו שוב.`);
  }
  const result = (await response.json().catch(() => ({}))) as Partial<PdfUpload> & { error?: string };

  // The server's own wording says what went wrong; without it the person only
  // sees "failed" and cannot tell a large file from a damaged one.
  if (!response.ok || !result.src || !result.path || !result.pages) {
    throw new Error(result.error ?? `העלאת "${file.name}" נכשלה (${response.status})`);
  }

  return {
    src: result.src,
    type: "pdf",
    width: result.width,
    height: result.height,
    pages: result.pages,
    pageCount: result.pageCount,
    path: result.path,
  };
}

/**
 * A file taken out of the form is not deleted at once: the admin may still
 * press "ביטול", and a saved work would then lose a picture it still uses.
 * The form lists it here, and `settleAssets` removes it after a save.
 *
 * The entry is the file's URL, not its path: a saved work is compared to the
 * form by URL (`asset.src`), and when a path stood in for it here the file was
 * never matched and never deleted.
 */
const removedUploads = new Set<string>();

/** A file removed from the form, remembered until the form is saved. */
export function dropAsset(asset: { src: string }): void {
  if (asset.src) removedUploads.add(asset.src);
}

/** Where a file's page pictures live: `<folder>/pages/page-NN.webp`. */
function pagePaths(path: string, pageCount: number): string[] {
  const folder = path.slice(0, path.lastIndexOf("/"));
  return Array.from(
    { length: pageCount },
    (_, i) => `${folder}/pages/page-${String(i + 1).padStart(2, "0")}.webp`,
  );
}

/**
 * Called after the work was saved: takes out the files that were removed from
 * the form — and, for a removed PDF, the pages rendered beside it.
 *
 * A PDF sits in a folder of its own (`<slug>/<stem>/<file>.pdf`) with its
 * pages in `<slug>/<stem>/pages`. Its page pictures are not listed in the
 * form, so they are worked out from the file's path and removed with it.
 * Removing a name that does not exist is harmless, so the removal does not
 * have to ask first how many pages the file had.
 */
export async function settleAssets(assets: { src: string }[]): Promise<void> {
  const kept = new Set(assets.map((asset) => asset.src));
  const orphans = [...removedUploads].filter((url) => !kept.has(url));
  removedUploads.clear();

  const paths = orphans.map((url) => storagePathFromUrl(url)).filter((path): path is string => Boolean(path));
  if (paths.length === 0) return;

  await createSupabaseBrowserClient()
    .storage.from("works")
    .remove(paths.flatMap((path) => (path.toLowerCase().endsWith(".pdf") ? [path, ...pagePaths(path, MAX_PDF_PAGES)] : [path])));
}

/**
 * How many page pictures a PDF may have — the same ceiling the render route
 * applies.
 */
const MAX_PDF_PAGES = 160;

/** Turns the public URL back into a storage path. */
export function storagePathFromUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/works/";
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
