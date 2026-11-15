import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getWorkForEdit } from "@/lib/admin/works";
import { SetupNotice } from "@/components/admin/setup-notice";
import { WorkForm } from "@/components/admin/work-form";

export const metadata: Metadata = { title: "עריכת עבודה" };

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditWorkPage({ params }: PageProps) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { id } = await params;
  const draft = await getWorkForEdit(id);
  if (!draft) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin" className="text-sm text-ink-dim transition-colors hover:text-accent">
        → חזרה לרשימה
      </Link>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-white">עריכת עבודה</h1>
          <p className="mt-2 text-sm text-ink-dim">{draft.title}</p>
        </div>
        <div className="flex items-center gap-5 text-sm">
          {draft.published ? (
            <Link
              href={`/works/${draft.slug}`}
              target="_blank"
              className="text-ink-dim transition-colors hover:text-accent"
            >
              צפייה באתר ↗
            </Link>
          ) : (
            <span className="text-xs text-ink-faint">העבודה מוסתרת מהאתר</span>
          )}
          <Link
            href="/admin/works/new"
            className="text-ink-dim transition-colors hover:text-accent"
          >
            + עבודה חדשה
          </Link>
        </div>
      </div>

      <div className="mt-10">
        <p className="mb-6 text-xs text-ink-faint">
          הסדר באתר נקבע בגרירת השורות ברשימה, ואינו משתנה מהעמוד הזה.
        </p>
        <WorkForm initial={draft} />
      </div>
    </div>
  );
}
