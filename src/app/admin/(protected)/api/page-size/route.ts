import { NextResponse } from "next/server";

/**
 * The width and height of a stored page picture.
 *
 * Every page of a PDF is rendered the same way, and a PDF's pages share one
 * format, so the shape is usually known from how many pages it has. This route
 * answers for the cases where the shape is not known — an uploaded booklet
 * whose page sizes were not kept, or a page that is a cover of another format.
 *
 * Asked with `path` it reads one page; asked with `pdf` it reads the pages
 * rendered beside that file, in order, and leaves out the ones missing.
 *
 * Only the `works` bucket is ever read, and only under it.
 */

export const runtime = "nodejs";

const SAFE_PAGE = /^[a-z0-9א-ת][a-z0-9א-ת._\-/]*\/pages\/page-\d+\.webp$/i;
const SAFE_PDF = /^[a-z0-9א-ת][a-z0-9א-ת._\-/]*\.pdf$/i;
/** A folder cannot hold more pages than this; reading stops there. */
const MAX_PAGES = 160;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("path");
  const pdf = searchParams.get("pdf");

  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!origin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const base = `${origin}/storage/v1/object/public/works/`;

  if (page) {
    if (!SAFE_PAGE.test(page) || page.includes("..")) {
      return NextResponse.json({ error: "invalid_path" }, { status: 400 });
    }
    const size = await readPage(`${base}${encodePath(page)}`);
    if (!size) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(size);
  }

  if (pdf) {
    if (!SAFE_PDF.test(pdf) || pdf.includes("..")) {
      return NextResponse.json({ error: "invalid_path" }, { status: 400 });
    }
    const folder = pdf.slice(0, pdf.lastIndexOf("/"));
    const pages = await readPages(`${base}${encodePath(folder)}/pages`);
    return NextResponse.json({ pages });
  }

  return NextResponse.json({ error: "missing_path" }, { status: 400 });
}

/** Sizes of page-NN.webp, page 1 first, until one is missing. */
async function readPages(dirUrl: string) {
  const found: { width: number; height: number }[] = [];
  for (let index = 1; index <= MAX_PAGES; index += 1) {
    const size = await readPage(`${dirUrl}/page-${String(index).padStart(2, "0")}.webp`);
    if (!size) break;
    found.push(size);
  }
  return found;
}

async function readPage(url: string): Promise<{ width: number; height: number } | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  return webpSize(bytes);
}

function encodePath(rel: string): string {
  return rel.split("/").map(encodeURIComponent).join("/");
}

/** Width and height from a WebP header — enough to size a slot, not a decoder. */
function webpSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30 || buf.toString("latin1", 0, 4) !== "RIFF" || buf.toString("latin1", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buf.toString("latin1", 12, 16);

  // Lossy: the canvas size is in the VP8 frame header.
  if (chunk === "VP8 ") {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }

  // Lossless: canvas size, in a 14-bit-per-side form.
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  // Extended (alpha, metadata): the canvas size follows the "VP8X" flag byte.
  if (chunk === "VP8X") {
    return {
      width: buf.readUIntLE(24, 3) + 1,
      height: buf.readUIntLE(27, 3) + 1,
    };
  }

  return null;
}
