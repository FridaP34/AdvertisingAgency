"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { WorkAsset } from "@/lib/works";

type LightboxProps = {
  assets: WorkAsset[];
  title: string;
  /** Index to open, or `null` when closed. */
  open: number | null;
  onClose: () => void;
};

/**
 * Full-screen view of the pieces, so a gallery of moderate-size prints stays
 * readable without making every image huge on the page itself. Arrow keys and
 * swipe-free buttons navigate; Escape closes.
 */
export function AssetLightbox({ assets, title, open, onClose }: LightboxProps) {
  const [index, setIndex] = useState(open ?? 0);

  useEffect(() => {
    if (open !== null) setIndex(open);
  }, [open]);

  const step = useCallback(
    (delta: number) => setIndex((i) => (i + delta + assets.length) % assets.length),
    [assets.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        // RTL: the left arrow goes forward through the gallery.
        step(event.key === "ArrowLeft" ? 1 : -1);
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, step]);

  if (open === null) return null;
  const asset = assets[index];
  if (!asset) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — תצוגה מלאה`}
      className="fixed inset-0 z-[60] flex flex-col bg-surface-base/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-5 py-4 text-xs tracking-[0.2em] text-ink-dim sm:px-8">
        <span>
          {String(index + 1).padStart(2, "0")} / {String(assets.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-line px-3 py-1.5 text-ink transition-colors hover:border-accent hover:text-accent"
        >
          סגירה ✕
        </button>
      </div>

      <div
        className="relative flex-1"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={asset.src}
          alt={asset.caption ? `${title} — ${asset.caption}` : title}
          fill
          sizes="100vw"
          unoptimized
          className="object-contain p-4 sm:p-10"
          priority
        />
      </div>

      {assets.length > 1 ? (
        <div
          className="flex items-center justify-center gap-6 pb-5"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="הקודם"
            className="rounded-sm border border-line px-4 py-2 text-ink-dim transition-colors hover:border-accent hover:text-accent"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="הבא"
            className="rounded-sm border border-line px-4 py-2 text-ink-dim transition-colors hover:border-accent hover:text-accent"
          >
            ←
          </button>
        </div>
      ) : null}
    </div>
  );
}
