"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { AdminWorkSummary } from "@/lib/admin/works";
import { cn } from "@/lib/cn";
import { deleteWork, reorderWorks, setWorkPublished } from "@/app/admin/actions";

const typeLabel: Record<AdminWorkSummary["type"], string> = {
  "single-ad": "מודעה",
  teaser: "טיזרים",
  branding: "מיתוג",
  brochure: "חוברת",
};

/**
 * The works list. Ordering is local-first: moving a row updates the screen at
 * once and saves the whole order in the background, so dragging stays smooth
 * even on a slow connection.
 */
export function WorksTable({ works: initial }: { works: AdminWorkSummary[] }) {
  const [works, setWorks] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // After a save the server page re-renders with fresh data; keep in sync.
  useEffect(() => setWorks(initial), [initial]);

  function move(from: number, to: number) {
    if (to < 0 || to >= works.length || from === to) return;

    const next = [...works];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setWorks(next);
    setError(null);

    startTransition(async () => {
      const result = await reorderWorks(next.map((work) => work.id));
      if (!result.ok) setError(result.error);
    });
  }

  async function toggle(work: AdminWorkSummary) {
    setBusy(work.id);
    setError(null);
    const nextPublished = !work.published;
    setWorks((current) =>
      current.map((w) => (w.id === work.id ? { ...w, published: nextPublished } : w)),
    );

    const result = await setWorkPublished(work.id, nextPublished);
    if (!result.ok) {
      setWorks((current) =>
        current.map((w) => (w.id === work.id ? { ...w, published: work.published } : w)),
      );
      setError(result.error);
    }
    setBusy(null);
  }

  async function remove(work: AdminWorkSummary) {
    const confirmed = window.confirm(
      `למחוק את "${work.title}"?\nהמחיקה אינה ניתנת לביטול.`,
    );
    if (!confirmed) return;

    setBusy(work.id);
    setError(null);
    const result = await deleteWork(work.id);
    if (result.ok) {
      setWorks((current) => current.filter((w) => w.id !== work.id));
    } else {
      setError(result.error);
    }
    setBusy(null);
  }

  if (works.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-line-strong px-8 py-16 text-center">
        <p className="text-ink-dim">אין עבודות עדיין.</p>
        <Link
          href="/admin/works/new"
          className="mt-4 inline-block text-sm text-accent underline-offset-4 hover:underline"
        >
          הוספת העבודה הראשונה
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 rounded-sm border border-accent/40 bg-accent-glow px-4 py-3 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <ul className="overflow-hidden rounded-sm border border-line">
        {works.map((work, index) => (
          <li
            key={work.id}
            // A double click anywhere on the row — not on one of its buttons —
            // opens the work for editing.
            onDoubleClick={(event) => {
              if ((event.target as HTMLElement).closest("a, button")) return;
              router.push(`/admin/works/${work.id}`);
            }}
            draggable
            onDragStart={() => setDragging(work.id)}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!dragging) return;
              const from = works.findIndex((w) => w.id === dragging);
              move(from, index);
              setDragging(null);
            }}
            className={cn(
              "flex items-center gap-4 border-b border-line bg-surface-soft px-4 py-3 last:border-b-0",
              dragging === work.id && "opacity-40",
            )}
          >
            {/* Drag handle */}
            <span
              aria-hidden
              title="גרירה לשינוי סדר"
              className="hidden cursor-grab select-none text-lg leading-none text-ink-faint sm:block active:cursor-grabbing"
            >
              ⠿
            </span>

            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-surface-base">
              {work.cover ? (
                <Image
                  src={work.cover}
                  alt=""
                  fill
                  // The admin runs against local demo storage just as often as
                  // the live one; a 48px thumbnail is not worth routing through
                  // the optimiser, which stumbles on the smaller servers.
                  unoptimized
                  sizes="48px"
                  // A page picture is shown whole — a face or a headline must
                  // not be cut off in the thumbnail.
                  className="object-cover object-top"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-[0.55rem] leading-tight text-ink-faint">
                  אין עדיין תמונה
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{work.title}</p>
              <p className="mt-1 truncate text-xs text-ink-dim">
                {[work.client, typeLabel[work.type]].filter(Boolean).join(" · ")}
              </p>
            </div>

            <span
              className={cn(
                "hidden rounded-sm border px-2 py-0.5 text-[0.66rem] tracking-[0.12em] sm:inline",
                work.published
                  ? "border-accent/40 text-accent"
                  : "border-line-strong text-ink-faint",
              )}
            >
              {work.published ? "מוצג" : "מוסתר"}
            </span>

            {/* Touch-friendly ordering, since drag-and-drop needs a mouse */}
            <div className="flex flex-col sm:hidden">
              <button
                type="button"
                aria-label="העברה למעלה"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                className="px-2 text-ink-dim disabled:opacity-25"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label="העברה למטה"
                disabled={index === works.length - 1}
                onClick={() => move(index, index + 1)}
                className="px-2 text-ink-dim disabled:opacity-25"
              >
                ▼
              </button>
            </div>

            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => toggle(work)}
                disabled={busy === work.id}
                className="rounded-sm px-2 py-1.5 text-ink-dim transition-colors hover:text-accent disabled:opacity-40"
              >
                {work.published ? "הסתרה" : "פרסום"}
              </button>
              <Link
                href={`/admin/works/${work.id}`}
                className="rounded-sm px-2 py-1.5 text-ink-dim transition-colors hover:text-white"
              >
                עריכה
              </Link>
              <button
                type="button"
                onClick={() => remove(work)}
                disabled={busy === work.id}
                className="rounded-sm px-2 py-1.5 text-ink-faint transition-colors hover:text-accent disabled:opacity-40"
              >
                מחיקה
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-ink-faint">
        הסדר ברשימה הוא הסדר באתר; גרירת שורה משנה אותו. לחיצה כפולה על שורה פותחת אותה לעריכה.
      </p>
    </div>
  );
}
