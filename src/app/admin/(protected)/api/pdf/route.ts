import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pagePath, pdfPagesFolder, renderPdfPages } from "@/lib/pdf/render";

/**
 * Uploads a PDF and renders its pages beside it.
 *
 * The browser cannot render a PDF into pictures on its own, and the site shows
 * pages as pictures (a PDF viewer is not guaranteed in a filtered
 * environment). So the file goes through here: it is stored in the `works`
 * bucket under `<slug>/<name>.pdf`, every page is rendered to
 * `<slug>/pages/page-NN.webp` — the file name is unique, so each PDF has its
 * own pages folder and two files in one work never overwrite each other — and
 * the reply carries the URLs and sizes the form needs.
 *
 * Runs with the signed-in user's own session, so Storage's policy applies.
 */

export const runtime = "nodejs";

const MAX_PDF_BYTES = 24 * 1024 * 1024;
// The same rule `isValidSlug` applies in the form, final Hebrew letters
// included, so a slug the form accepted is never refused here.
const SLUG_RE = /^[a-z0-9א-תךםןףץ-]{1,80}$/;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Reads a text field straight out of the multipart body.
 *
 * `formData()` decoded the fields as Latin-1 on this server, so a Hebrew
 * address such as "שלום" arrived as four "" and was refused. The raw bytes
 * are read here instead and decoded as UTF-8 — which is what a browser sends.
 * Returns `null` when the field is absent or not valid UTF-8, and the caller
 * then falls back to `formData()`.
 */
function readField(body: Buffer, contentType: string | null, name: string): string | null {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? "");
  if (!boundary) return null;

  const marker = body.indexOf(`name="${name}"`, 0, "latin1");
  if (marker === -1) return null;
  const start = body.indexOf("\r\n\r\n", marker);
  if (start === -1) return null;
  const from = start + 4;
  const end = body.indexOf("\r\n", from);
  if (end === -1) return null;

  try {
    // `ignoreBOM` keeps a leading mark, if any, as a character — it is not a
    // letter, so the slug rule refuses it rather than silently dropping it.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(body.subarray(from, end));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("פגה ההתחברות. יש להתחבר שוב.", 401);

  // The body is read once as bytes: the file comes out of `formData()`, which
  // is binary-safe, and the address comes out of the raw bytes (see
  // `readField`). A body over the server's ceiling arrives cut off and
  // parsing it throws — a size problem, answered as one.
  const contentType = request.headers.get("content-type");
  let raw: Buffer;
  let form: FormData;
  try {
    raw = Buffer.from(await request.arrayBuffer());
  } catch {
    return bad("העלאת ה־PDF נכשלה — החיבור הופרע. נסו שוב.", 413);
  }
  try {
    form = await new Response(raw, { headers: { "content-type": contentType ?? "" } }).formData();
  } catch {
    console.error("[admin] PDF request body could not be parsed (too large?)");
    return bad("העלאת ה־PDF נכשלה. הקובץ גדול מדי או שהחיבור הופרע — נסו שוב.", 413);
  }

  const file = form.get("file");
  const slug = (readField(raw, contentType, "slug") ?? String(form.get("slug") ?? "")).trim().toLowerCase();

  if (!(file instanceof File)) return bad("לא נבחר קובץ");
  if (!SLUG_RE.test(slug)) return bad("נא למלא כתובת אתר תקינה לפני העלאת קובץ");
  if (file.size > MAX_PDF_BYTES) return bad(`"${file.name}" גדול מ־24MB. יש להקטין אותו לפני ההעלאה.`, 413);

  const pdf = Buffer.from(await file.arrayBuffer());
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") return bad("הקובץ אינו קובץ PDF תקין");

  let pages;
  try {
    pages = await renderPdfPages(pdf);
  } catch (error) {
    console.error("[admin] PDF render failed:", error);
    return bad("קריאת ה־PDF נכשלה. ייתכן שהקובץ פגום או מוגן.", 422);
  }
  if (pages.length === 0) return bad("לא נמצאו עמודים ב־PDF", 422);

  const stamp = Date.now();
  const baseName =
    file.name
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 40) || "file";
  // The file gets a folder of its own under the work, so its pages never sit
  // in a folder shared with another PDF's.
  const pdfPath = `${slug}/${stamp}-${baseName}/${stamp}-${baseName}.pdf`;
  const bucket = supabase.storage.from("works");

  const { error: pdfError } = await bucket.upload(pdfPath, pdf, {
    cacheControl: "31536000",
    contentType: "application/pdf",
    upsert: false,
  });
  if (pdfError) {
    console.error("[admin] PDF upload failed:", pdfError.message);
    return bad("העלאת ה־PDF נכשלה", 500);
  }

  // One request per page, in order, so a failure names the page it stopped at.
  const saved: string[] = [];
  const pagesFolder = pdfPagesFolder(pdfPath);
  for (const page of pages) {
    const path = pagePath(pagesFolder, page.index);
    const { error } = await bucket.upload(path, new Blob([new Uint8Array(page.buffer)], { type: "image/webp" }), {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: true,
    });
    if (error) {
      console.error("[admin] page upload failed:", error.message);
      await bucket.remove([pdfPath, ...saved]);
      return bad("שמירת עמודי ה־PDF נכשלה", 500);
    }
    saved.push(path);
  }
  const first = pages[0];
  return NextResponse.json({
    src: bucket.getPublicUrl(pdfPath).data.publicUrl,
    path: pdfPath,
    // `width` is where the save keeps the first page's width, `height` the
    // page count (the public reader's only way to know how many pages there
    // are), and `firstHeight` the first page's own height, if ever needed.
    width: first.width,
    height: pages.length,
    firstHeight: first.height,
    pageCount: pages.length,
    pages: pages.map((page) => ({ width: page.width, height: page.height })),
  });
}
