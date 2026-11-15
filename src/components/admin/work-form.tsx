"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveWork } from "@/lib/admin/save-work";
import { settleAssets } from "@/lib/admin/upload";
import { uniqueSlug } from "@/lib/admin/slug";
import { workTypeOptions, type WorkDraft } from "@/lib/works/draft";
import type { WorkAsset } from "@/lib/works/types";
import { cn } from "@/lib/cn";
import { AssetList } from "./asset-list";
import { adminCardClass, adminFieldClass, adminLabelClass } from "./styles";

export function WorkForm({
  initial,
  takenSlugs = [],
}: {
  initial: WorkDraft;
  /** Every address in use — a new work's suggestion steps around them. */
  takenSlugs?: string[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = Boolean(initial.id);

  function set<K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  /** Until the address is typed by hand, it follows the title. */
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.id));

  function handleTitle(value: string) {
    setDraft((current) => ({
      ...current,
      title: value,
      slug: slugEdited ? current.slug : uniqueSlug(value, takenSlugs),
    }));
  }

  /** Files chosen but not yet uploaded — a save must not leave them out. */
  const uploading = draft.assets.some((asset) => (asset as { uploading?: boolean }).uploading);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) {
      setError("יש קבצים שעדיין נטענים. יש להמתין לסיום ההעלאה ואז לשמור.");
      return;
    }

    setSaving(true);
    setError(null);

    let result;
    try {
      result = await saveWork(draft);
    } catch {
      result = { ok: false as const, error: "השמירה נכשלה. בדקו את החיבור ונסו שוב." };
    }
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }

    // Only now are the files taken out of the form safe to delete.
    await settleAssets(draft.assets).catch(() => undefined);

    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className={cn(adminCardClass, "p-6 lg:p-8")}>
        <h2 className="text-lg font-bold text-white">פרטי העבודה</h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className={adminLabelClass}>כותרת *</span>
            <input
              name="title"
              autoComplete="off"
              value={draft.title}
              onChange={(event) => handleTitle(event.target.value)}
              required
              className={adminFieldClass}
              placeholder="למשל: שיקמה — קמפיין מיתוג"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={adminLabelClass}>שם הלקוח</span>
            <input
              name="client"
              autoComplete="off"
              value={draft.client}
              onChange={(event) => set("client", event.target.value)}
              className={adminFieldClass}
              placeholder="לא חובה"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className={adminLabelClass}>סוג עבודה *</span>
            <select
              value={draft.type}
              onChange={(event) => set("type", event.target.value as WorkDraft["type"])}
              className={adminFieldClass}
            >
              {workTypeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-surface-soft">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className={adminLabelClass}>תחום *</span>
            <input
              name="category"
              autoComplete="off"
              value={draft.category}
              onChange={(event) => set("category", event.target.value)}
              required
              list="category-suggestions"
              className={adminFieldClass}
              placeholder="תרבות תורנית, קניונים, נדל״ן…"
            />
            <datalist id="category-suggestions">
              <option value="תרבות תורנית" />
              <option value="ערים" />
              <option value="קניונים" />
              <option value="בניינים" />
              <option value="חנויות" />
              <option value="נדל״ן" />
              <option value="תיירות ונופש" />
              <option value="מיתוג" />
            </datalist>
          </label>

          <label className="flex flex-col gap-2">
            <span className={adminLabelClass}>כתובת האתר (אנגלית או עברית) *</span>
            <input
              name="slug"
              autoComplete="off"
              value={draft.slug}
              onChange={(event) => {
                setSlugEdited(true);
                set("slug", event.target.value);
              }}
              required
              dir="ltr"
              className={cn(adminFieldClass, "text-start")}
              placeholder="shikma"
            />
            <span className="text-[0.7rem] text-ink-faint">
              תופיע בכתובת: /works/{draft.slug || "…"} — אותיות, ספרות ומקפים בלבד.
            </span>
          </label>

          <label className="flex flex-col gap-2">
            <span className={adminLabelClass}>שנה</span>
            <input
              name="year"
              inputMode="numeric"
              autoComplete="off"
              value={draft.year}
              onChange={(event) => set("year", event.target.value)}
              className={adminFieldClass}
              placeholder="2025"
            />
          </label>
        </div>

        <label className="mt-5 flex flex-col gap-2">
          <span className={adminLabelClass}>תיאור קצר (מוצג בכרטיס ובעמוד העבודה)</span>
          <textarea
            value={draft.summary}
            onChange={(event) => set("summary", event.target.value)}
            rows={2}
            className={cn(adminFieldClass, "resize-y")}
          />
        </label>

        <label className="mt-5 flex flex-col gap-2">
          <span className={adminLabelClass}>הסבר מלא — לפרויקטים עם טיזרים או מיתוג</span>
          <textarea
            value={draft.story}
            onChange={(event) => set("story", event.target.value)}
            rows={6}
            className={cn(adminFieldClass, "resize-y leading-relaxed")}
            placeholder="סיפור הקמפיין: הרקע, הרעיון, ואיך נבנה הפתרון. אפשר להשאיר ריק במודעה בודדת."
          />
        </label>

        <label className="mt-6 flex items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) => set("published", event.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          הצגה באתר (בטל סימון כדי לשמור כטיוטה)
        </label>
      </section>

      <section className={cn(adminCardClass, "p-6 lg:p-8")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-white">תמונות וקבצים</h2>
          <span className="text-xs text-ink-faint">התמונה הראשונה היא תמונת השער</span>
        </div>
        <div className="mt-6">
          <AssetList
            slug={draft.slug}
            assets={draft.assets as (WorkAsset & { uploading?: boolean })[]}
            onChange={(update) => setDraft((current) => ({ ...current, assets: update(current.assets) }))}
          />
        </div>
      </section>

      {error ? (
        <p role="alert" className="rounded-sm border border-accent/40 bg-accent-glow px-4 py-3 text-sm text-accent">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-sm bg-[linear-gradient(120deg,theme(colors.accent.DEFAULT),theme(colors.accent.deep))] px-8 py-3 text-sm font-medium text-[#140a0c] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? "ממתין להעלאת הקבצים…" : saving ? "שומר…" : editing ? "שמירת שינויים" : "יצירת העבודה"}
        </button>
        <Link href="/admin" className="text-sm text-ink-dim transition-colors hover:text-accent">
          ביטול
        </Link>
      </div>
    </form>
  );
}
