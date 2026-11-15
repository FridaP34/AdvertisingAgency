/**
 * Renders the first page (or a given page) of a PDF to a WebP image.
 *
 * Usage: node tools/render-pdf.mjs <input.pdf> <output.webp> [maxWidth]
 *
 * Kept as a dev tool — not part of the site build.
 */
import { readFile, writeFile } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";

const [, , input, output, maxWidthArg] = process.argv;
if (!input || !output) {
  console.error("usage: node tools/render-pdf.mjs <input.pdf> <output.webp> [maxWidth]");
  process.exit(1);
}
const maxWidth = Number(maxWidthArg ?? 1400);

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(await readFile(input));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
const page = await doc.getPage(1);

const base = page.getViewport({ scale: 1 });
const scale = Math.min(3, maxWidth / base.width);
const viewport = page.getViewport({ scale });

const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
const context = canvas.getContext("2d");

// White background: PDF pages are transparent by default once rendered.
context.fillStyle = "#ffffff";
context.fillRect(0, 0, canvas.width, canvas.height);

await page.render({ canvasContext: context, viewport }).promise;
const png = canvas.toBuffer("image/png");

await sharp(png).webp({ quality: 86 }).toFile(output);
console.log(`${output} — ${canvas.width}x${canvas.height}, page 1/${doc.numPages}`);
await doc.destroy();
