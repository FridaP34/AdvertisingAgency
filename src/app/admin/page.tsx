import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listAllWorks } from "@/lib/admin/works";
import { SetupNotice } from "@/components/admin/setup-notice";
import { WorksTable } from "@/components/admin/works-table";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "עבודות" };

// Always show the current state of the database, never a cached page.
export const dynamic = "force-dynamic";

export default async function AdminWorksPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const works = await listAllWorks();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div>
          <h1 className="text-3xl font-black text-white">העבודות באתר</h1>
          <p className="mt-2 text-sm text-ink-dim">
            {works.length === 0
              ? "עדיין אין עבודות במסד הנתונים — אפשר לייבא את ההתחלה הקיימת."
              : `${works.filter((w) => w.published).length} מוצגות מתוך ${works.length}`}
          </p>
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="/admin/works/new"
            className="rounded-sm bg-[linear-gradient(120deg,theme(colors.accent.DEFAULT),theme(colors.accent.deep))] px-6 py-2.5 text-sm font-medium text-[#140a0c] transition-opacity hover:opacity-90"
          >
            + עבודה חדשה
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-ink-dim transition-colors hover:text-accent"
            >
              יציאה מהחשבון
            </button>
          </form>
        </div>
      </div>

      <div className="mt-10">
        <WorksTable works={works} />
      </div>
    </div>
  );
}
