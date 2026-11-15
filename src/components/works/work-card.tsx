import Image from "next/image";
import Link from "next/link";
// Types and the first-page helper only: this file runs in the browser too, and
// the works index there (`@/lib/works`) imports `next/headers`, which pulls the
// whole server read into the browser bundle instead of the server's.
import type { ResolvedWork, WorkAsset } from "@/lib/works";
import { pdfFirstPage } from "@/lib/works/pages";
import { cn } from "@/lib/cn";

const typeLabel: Record<ResolvedWork["type"], string> = {
  "single-ad": "מודעה",
  teaser: "טיזרים",
  branding: "מיתוג",
  brochure: "חוברת",
};

/** A teaser is the build-up; the ad is the reveal. The card shows the reveal. */
function isTeaser(asset: WorkAsset) {
  return /^טיזר/.test(asset.caption ?? "");
}

/**
 * The picture a card leads with.
 *
 * A campaign that has both teasers and ads is represented by its ad — the
 * finished work — not by a teaser that, on its own, says nothing about the
 * client. A teaser-only campaign keeps its teaser. A work whose piece is a PDF
 * leads with that PDF's first page, not with a placeholder.
 */
export function cardCover(work: ResolvedWork): WorkAsset {
  const images = work.assets.filter((asset) => asset.type === "image");
  const ad = images.find((asset) => !isTeaser(asset));
  if (ad) return ad;
  if (images.length > 0) return images[0];
  // The reveal, not the build-up: the last file of a campaign is its ad.
  const pdf = work.assets.filter((asset) => asset.type === "pdf").at(-1);
  if (pdf) return pdfFirstPage(pdf);
  return work.cover;
}

type WorkCardProps = {
  work: ResolvedWork;
  /** Lets each card declare how much of the grid it spans. */
  className?: string;
  priority?: boolean;
};

/**
 * A gallery tile: the work's picture inside one thin frame, with the caption
 * under it. One frame, single ad or campaign alike — the number of pieces is
 * told by the small count, not by drawing frames behind frames.
 *
 * The picture is never cropped: the frame has a fixed height, but the image
 * sits inside it whole (`object-contain`), so an ad that was not cut in print
 * is not cut here either.
 */
export function WorkCard({ work, className, priority = false }: WorkCardProps) {
  const cover = cardCover(work);
  // A PDF is one piece, however many pages it holds.
  const count = work.assets.filter((a) => a.type === "image" || a.type === "pdf").length;

  return (
    <Link href={`/works/${work.slug}`} className={cn("group flex h-full flex-col", className)}>
      <div className="relative">
        <div className="relative overflow-hidden rounded-sm border border-line bg-surface-base p-1.5 transition-colors duration-500 group-hover:border-accent/40 sm:p-2">
          {/* A mat, not a crop: every cover is shown whole. */}
          <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden">
            <Image
              src={cover.src}
              alt={work.client ? `${work.title} — ${work.client}` : work.title}
              width={cover.width ?? 1000}
              height={cover.height ?? 1400}
              priority={priority}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              // Served straight from Storage. Through `/ _next/image` every
              // picture costs a Vercel function call, and that function's
              // burst limit answers 403 on a gallery that shows many at once.
              unoptimized
              className="max-h-full w-auto max-w-full object-contain transition-transform duration-[1100ms] ease-smooth group-hover:scale-[1.02]"
            />
          </div>

          <span className="absolute end-5 top-5 rounded-sm bg-surface-base/70 px-2 py-1 text-[0.62rem] tracking-[0.16em] text-ink-dim backdrop-blur">
            {typeLabel[work.type]}
          </span>

          {count > 1 ? (
            <span className="absolute bottom-5 start-5 rounded-sm bg-surface-base/70 px-2 py-1 text-[0.62rem] tracking-[0.16em] text-ink-dim backdrop-blur">
              {count} פריטים
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-4 px-1 pt-4">
        <div className="min-w-0">
          {work.client ? (
            <p className="text-[0.66rem] tracking-[0.24em] text-accent">{work.client}</p>
          ) : null}
          <h3 className="mt-1.5 truncate text-base font-bold text-white transition-colors group-hover:text-accent">
            {work.title}
          </h3>
        </div>
        <span
          aria-hidden
          className="shrink-0 text-ink-faint transition-all duration-300 group-hover:-translate-x-1 group-hover:text-accent"
        >
          ←
        </span>
      </div>
    </Link>
  );
}
