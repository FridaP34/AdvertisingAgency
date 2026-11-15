"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ResolvedWork } from "@/lib/works";
import { WorkCard } from "./work-card";
import { cn } from "@/lib/cn";

/**
 * The three shelves a visitor sees.
 *
 *   ads      — one file: a single ad (a campaign whose teasers and ads are one
 *              story still belongs here; its type only describes its shape).
 *   branding — a folder with several pieces.
 *   brochure — the booklets from the `חוברות` folder.
 *
 * Teasers are not a shelf: a teaser is the opening of an ad, and is shown
 * inside the ad's own page.
 */
type FilterId = "all" | "single-ad" | "branding" | "brochure";

const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "single-ad", label: "מודעות" },
  { id: "branding", label: "מיתוג" },
  { id: "brochure", label: "חוברות" },
];

/** Which shelf a work sits on. */
function shelfOf(work: ResolvedWork): Exclude<FilterId, "all"> {
  if (work.type === "brochure") return "brochure";
  if (work.type === "teaser") return "single-ad";
  return work.type;
}

type WorkGalleryProps = {
  works: ResolvedWork[];
};

/**
 * Client-side filtered gallery.
 *
 * Filtering happens in the browser over the already-rendered cards, so
 * switching categories is instant — no request, no loading state.
 * A `?type=` in the URL (from the service cards on the home page) opens the
 * gallery on that category.
 */
export function WorkGallery({ works }: WorkGalleryProps) {
  const requested = useSearchParams().get("type");
  const initial = filters.find((filter) => filter.id === requested)?.id ?? "all";
  const [active, setActive] = useState<FilterId>(initial);

  const visible = useMemo(
    () =>
      active === "all"
        ? works.filter((w) => w.type !== "brochure")
        : works.filter((w) => shelfOf(w) === active),
    [works, active],
  );

  const countOf = (id: FilterId) =>
    id === "all"
      ? works.filter((w) => w.type !== "brochure").length
      : works.filter((w) => shelfOf(w) === id).length;

  return (
    <div className="mx-auto max-w-gallery">
      <div
        role="tablist"
        aria-label="סינון עבודות לפי סוג"
        className="flex flex-wrap items-center justify-center gap-2 border-b border-line pb-6"
      >
        {filters.map((filter) => {
          const count = countOf(filter.id);
          const disabled = count === 0;
          return (
            <button
              key={filter.id}
              role="tab"
              type="button"
              aria-selected={active === filter.id}
              disabled={disabled}
              onClick={() => setActive(filter.id)}
              className={cn(
                "rounded-sm border px-5 py-2 text-sm transition-colors duration-300",
                active === filter.id
                  ? "border-accent bg-accent-glow text-accent"
                  : "border-line text-ink-dim hover:border-line-strong hover:text-white",
                disabled && "cursor-not-allowed opacity-30",
              )}
            >
              {filter.label}
              <span className="ms-2 text-xs text-ink-faint">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-12 grid max-w-gallery gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7">
        {visible.map((work, index) => (
          <WorkCard key={work.slug} work={work} priority={index < 2} />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-20 text-center text-ink-dim">עוד עבודות בדרך.</p>
      ) : null}
    </div>
  );
}
