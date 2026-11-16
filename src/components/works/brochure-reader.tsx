"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { storagePathFromUrl } from "@/lib/admin/upload";

type Size = { width: number; height: number };

type BrochureReaderProps = {
  /** Folder the rendered pages live in, e.g. `<slug>/pages`. */
  base: string;
  /** Sizes of the rendered pages, as served — used for the layout. */
  pages: Size[];
  /** The page's shape (height ÷ width) when only the count is known. */
  aspect?: number;
  title: string;
};

/**
 * One page picture.
 *
 * When its size is known the slot is reserved at that size, so the page never
 * jumps while scrolling. When it is not, the slot is reserved by the booklet's
 * shape and the picture fills it — the page reads whole either way.
 */
function Page({ src, size, aspect, index, total, title }: {
  src: string;
  size?: Size;
  aspect: number;
  index: number;
  total: number;
  title: string;
}) {
  const known = Boolean(size && size.width > 0 && size.height > 0);

  return (
    <li className="relative overflow-hidden rounded-sm border border-line bg-white">
      {known ? (
        <Image
          src={src}
          alt={`${title} — עמוד ${index + 1}`}
          width={size!.width}
          height={size!.height}
          sizes="(max-width: 768px) 100vw, 46rem"
          unoptimized
          className="h-auto w-full"
          // The first page is the one above the fold; the rest load in turn.
          priority={index === 0}
        />
      ) : (
        <div className="relative w-full" style={{ aspectRatio: `1 / ${aspect}` }}>
          <Image
            src={src}
            alt={`${title} — עמוד ${index + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 46rem"
            unoptimized
            className="object-contain"
            priority={index === 0}
          />
        </div>
      )}
      <span
        aria-hidden
        className="absolute bottom-2 end-2 rounded-sm bg-black/45 px-1.5 py-0.5 text-[0.6rem] tracking-[0.16em] text-white/85"
      >
        {index + 1} / {total}
      </span>
    </li>
  );
}

/**
 * The booklet, read inside the page.
 *
 * A booklet is pages, so it is shown the way a booklet is read: every page
 * under the one before it, and the page scrolls. No PDF window, no viewer the
 * browser may not have, nothing to download — the pages are pictures rendered
 * once from the file, and they are all here from the start.
 */
export function BrochureReader({ base, pages, aspect, title }: BrochureReaderProps) {
  const sources = useMemo(
    () => pages.map((_, index) => `${base}/page-${String(index + 1).padStart(2, "0")}.webp`),
    [base, pages],
  );

  // Page sizes that were not recorded are read once, here, so every slot has
  // the right shape — and a cover of another format keeps its own.
  const [read, setRead] = useState<Size[] | null>(null);
  const unknown = pages.filter((size) => !size.width || !size.height).length > 0;

  useEffect(() => {
    if (!unknown) return;
    const rel = storagePathFromUrl(`${base}/page-01.webp`);
    const pdf = rel ? rel.replace(/\/pages\/page-\d+\.webp$/, "") : null;
    if (!pdf) return;

    let live = true;
    fetch(`/admin/api/page-size?pdf=${encodeURIComponent(pdf)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { pages?: Size[] } | null) => {
        const sizes = result?.pages?.filter((size) => size.width > 0) ?? [];
        if (live && sizes.length === pages.length) setRead(sizes);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [unknown, base, pages.length]);

  const sizes = read ?? pages;
  const shape = sizes.find((size) => size.width > 0);

  // Without page pictures there is nothing to read here. A PDF frame would
  // need a viewer the browser may not have, and a bare PDF link is held back
  // by some content filters, so the booklet is offered through contact.
  if (pages.length === 0) {
    const file = base.replace(/\/pages$/, "");
    return (
      <div className="mx-auto w-full max-w-[46rem] rounded-sm border border-line bg-surface-base p-8 text-center">
        <p className="text-sm text-ink-dim">החוברת אינה זמינה לתצוגה ברגע זה.</p>
        <p className="mt-3 text-xs text-ink-faint">
          אם הקישור אינו נפתח, אפשר לפנות אלינו ולקבל את החוברת בדרך אחרת.
        </p>
      </div>
    );
  }

  return (
    <ol className="mx-auto flex w-full max-w-[46rem] flex-col gap-4">
      {sources.map((src, index) => (
        <Page
          key={src}
          src={src}
          // Only layouts that match page by page may give a size to a page;
          // a short list would otherwise put one page's shape on another.
          size={sizes.length === pages.length ? sizes[index] : undefined}
          aspect={shape ? shape.height / shape.width : (aspect ?? 1.4)}
          index={index}
          total={pages.length}
          title={title}
        />
      ))}
    </ol>
  );
}
