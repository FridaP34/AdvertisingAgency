"use client";

import { useMemo, useState } from "react";
import type { WorkAsset } from "@/lib/works";
import { pagesBase, adminPages } from "@/lib/works/pages";
import { AssetLightbox } from "@/components/works/asset-lightbox";
import { BrochureReader } from "@/components/works/brochure-reader";
import { ImagePlate } from "@/components/works/image-plate";
import { cn } from "@/lib/cn";

function isTeaser(asset: WorkAsset) {
  return /^טיזר/.test(asset.caption ?? "");
}

/**
 * A PDF whose work has no picture yet is shown as its first page — one plate
 * in the normal grid, like any ad — rather than as a whole presentation. The
 * file itself is offered under the grid, so the full document is still there.
 */
function asAdFromPdf(file: WorkAsset): WorkAsset {
  const first = file.pages?.[0];
  return {
    src: `${pagesBase(file.src)}/page-01.webp`,
    type: "image",
    caption: file.caption,
    width: first?.width || file.width,
    height: first?.height || file.height,
  };
}

type WorkAssetsProps = {
  title: string;
  assets: WorkAsset[];
  /** A brochure is read page by page; every other kind, tile by tile. */
  kind?: "presentation" | "brochure";
};

/**
 * The pieces of a work, in one grid.
 *
 * A campaign is read in the order it was built — teasers first, then the ad —
 * but read as one sheet: one grid, one frame style, every plate of the same
 * shape, so a teaser row and the ad below it line up picture for picture.
 * Only a thin rule before the first ad marks where the reveal begins, so the
 * build-up is legible without splitting the wall into blocks.
 */
export function WorkAssets({ title, assets, kind = "presentation" }: WorkAssetsProps) {
  const stored = useMemo(() => assets.filter((asset) => asset.type === "image"), [assets]);
  const files = useMemo(() => assets.filter((asset) => asset.type === "pdf"), [assets]);
  // A brochure is read as pages — the pictures inside the file are the work.
  // Every other kind is read as ads: a PDF stands in the grid as its first
  // page, exactly like an image, and the file is offered below.
  const isBooklet = kind === "brochure" && files.length > 0;
  // A PDF shows its first page — but only when that page was found; a plate
  // with nothing to put on it would be an empty frame, so the file is then
  // listed below on its own.
  const asAds = useMemo(() => files.filter((file) => file.pages?.length), [files]);
  const images = useMemo(
    () => (isBooklet ? stored : [...stored, ...asAds.map(asAdFromPdf)]),
    [isBooklet, stored, asAds],
  );
  const extraFiles = isBooklet ? files : [];
  // Every file is offered for download — the ones shown as a page included.
  const downloads = isBooklet ? [] : files;

  // The first ad after the teasers; the grid marks it and nothing else.
  const revealAt = useMemo(() => {
    const index = images.findIndex((asset) => !isTeaser(asset));
    return index > 0 && images.slice(0, index).some(isTeaser) ? index : -1;
  }, [images]);

  const counts = useMemo(() => {
    const teasers = images.filter(isTeaser).length;
    const ads = images.length - teasers;
    const parts: string[] = [];
    if (teasers) parts.push(`${teasers} טיזרים`);
    if (ads) parts.push(`${ads} ${ads === 1 ? "מודעה" : "מודעות"}`);
    return parts.join(" · ");
  }, [images]);

  return (
    <div className="flex flex-col gap-14">
      {isBooklet ? null : (
        <section>
          {images.length > 1 ? (
            <div className="mb-6 flex items-baseline gap-4 border-b border-line pb-3">
              <h2 className="text-[0.7rem] tracking-[0.3em] text-accent">כל הקמפיין</h2>
              <p className="text-[0.72rem] tracking-[0.1em] text-ink-faint">
                לפי הסדר — מהטיזר ועד המודעה
              </p>
              <span className="ms-auto text-[0.68rem] tracking-[0.2em] text-ink-faint">
                {counts}
              </span>
            </div>
          ) : null}

          <ImageGrid title={title} items={images} revealAt={revealAt} />
        </section>
      )}

      {downloads.length ? (
        <section className="border-t border-line pt-8">
          <h2 className="mb-4 text-[0.7rem] tracking-[0.3em] text-accent">הקובץ</h2>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-dim">
            {downloads.map((file) => (
              <li key={file.src}>
                <a
                  href={file.src}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:text-accent hover:underline"
                >
                  {file.caption ?? `הורדת הקובץ (PDF${file.pages?.length ? `, ${file.pages.length} עמודים` : ""})`}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isBooklet ? (
        <section>
          <h2 className="mb-6 text-[0.7rem] tracking-[0.3em] text-accent">החוברת</h2>
          <ul className="flex flex-col gap-10">
            {extraFiles.map((file) => (
              <li key={file.src}>
                <BrochureReader
                  base={pagesBase(file.src)}
                  pages={file.pages ?? []}
                  aspect={adminPages(file)?.aspect}
                  title={file.caption ?? title}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** The ad's own name — the rule labels the ad for what it is. */
function adLabel(asset: WorkAsset, ads: number) {
  const caption = asset.caption?.trim();
  return caption && caption !== "מודעה" ? caption : ads > 1 ? "מודעה" : "פרסומת";
}

/**
 * The pictures as a sheet of plates: three across on a desktop, two on a
 * tablet, one on a phone. Every plate has the same frame and the same height
 * — a portrait and a landscape both sit inside it whole — so a row of teasers
 * and the ads beneath it stand level.
 *
 * The rule and the ad's name are drawn **inside** the ad's plate, at its foot,
 * and the picture shrinks to make room. Nothing sits above a plate, so a
 * labelled ad is exactly as tall as the teaser beside it.
 */
function ImageGrid({
  title,
  items,
  revealAt,
}: {
  title: string;
  items: WorkAsset[];
  revealAt: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;

  const ads = items.filter((asset) => !isTeaser(asset)).length;

  return (
    <>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-10">
        {items.map((asset, index) => {
          const before = index === revealAt;

          return (
            <li key={asset.src} className="relative">
              <ImagePlate
                asset={asset}
                title={title}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                onClick={() => setOpen(index)}
                frame={
                  before ? (
                    <div className="mt-1.5 flex shrink-0 items-center gap-3 border-t border-line pt-2" aria-hidden>
                      <span className="text-[0.62rem] tracking-[0.3em] text-accent">
                        {adLabel(asset, ads)}
                      </span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  ) : undefined
                }
              />

              <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[0.68rem] tracking-[0.16em] text-ink-faint">
                {/* Only the piece's own caption: a work with no captions gets
                    no repeated title under every plate. */}
                <span className="truncate">{asset.caption ?? ""}</span>
                <span
                  aria-hidden
                  className={cn(
                    "shrink-0 transition-colors group-hover:text-accent",
                    isTeaser(asset) && "opacity-70",
                  )}
                >
                  {isTeaser(asset) ? "טיזר" : "⤢"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <AssetLightbox assets={items} open={open} onClose={() => setOpen(null)} title={title} />
    </>
  );
}
