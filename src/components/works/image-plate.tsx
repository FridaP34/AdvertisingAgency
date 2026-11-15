"use client";

import Image from "next/image";
import type { WorkAsset } from "@/lib/works";

/**
 * One picture on a plate: one thin frame, a fixed plate height, and the
 * picture shown whole inside it (`object-contain`) — never cropped.
 *
 * The plate is what the work pages build on. Its height is fixed so a row of
 * teasers and the ads beneath it stand level, and any label above a plate
 * lives inside that same height (`frame` prop), so a captioned ad is not
 * pushed lower than its neighbours.
 */
export function ImagePlate({
  asset,
  title,
  sizes,
  onClick,
  frame,
}: {
  asset: WorkAsset;
  title: string;
  sizes: string;
  onClick?: () => void;
  /** A label row inside the plate — the ad rule, or the "פרסומת" caption. */
  frame?: React.ReactNode;
}) {
  const image = (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <Image
          src={asset.src}
          alt={asset.caption ? `${title} — ${asset.caption}` : title}
          width={asset.width ?? 1000}
          height={asset.height ?? 1250}
          sizes={sizes}
          unoptimized
          className="max-h-full w-auto max-w-full object-contain transition-transform duration-[900ms] ease-smooth group-hover:scale-[1.02]"
        />
      </div>
      {frame ?? null}
    </>
  );

  const plate = "relative flex h-[clamp(19rem,30vw,26rem)] flex-col overflow-hidden rounded-sm border border-line bg-surface-base p-1.5 transition-colors duration-500 group-hover:border-accent/40";

  if (!onClick) return <div className={plate}>{image}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full text-start"
      aria-label={`פתיחת ${asset.caption ?? title} בגודל מלא`}
    >
      <div className={plate}>{image}</div>
    </button>
  );
}
