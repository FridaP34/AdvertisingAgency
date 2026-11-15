import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listAllWorks } from "@/lib/admin/works";
import { emptyDraft } from "@/lib/works/draft";
import { SetupNotice } from "@/components/admin/setup-notice";
import { WorkForm } from "@/components/admin/work-form";

export const metadata: Metadata = { title: "עבודה חדשה" };

export const dynamic = "force-dynamic";

export default async function NewWorkPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  // New works go to the top of the list by default: ten below the lowest
  // display order, so it stays above the first row however low the numbers
  // have become. An empty list starts at the default order.
  const works = await listAllWorks();
  const lowest = works.reduce((min, work) => Math.min(min, work.order), Number.POSITIVE_INFINITY);
  const draft = emptyDraft(works.length === 0 ? 100 : lowest - 10);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">הוספה</p>
      <h1 className="mt-4 text-3xl font-black text-white">עבודה חדשה</h1>
      <p className="mt-2 text-sm text-ink-dim">
        ממלאים את הפרטים, מעלים את המודעות — והן מופיעות באתר מיד עם השמירה.
      </p>

      <div className="mt-10">
        {/* The addresses already in use, so the form never offers a taken one. */}
        <WorkForm initial={draft} takenSlugs={works.map((work) => work.slug)} />
      </div>
    </div>
  );
}
