import Link from "next/link";

/** Shown when the work of the link no longer exists — it was deleted meanwhile. */
export default function EditWorkNotFound() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-sm border border-dashed border-line-strong px-8 py-16 text-center">
        <h1 className="text-xl font-bold text-white">העבודה לא נמצאה</h1>
        <p className="mt-3 text-sm text-ink-dim">ייתכן שהיא נמחקה. אפשר לחזור לרשימה ולבחור עבודה אחרת.</p>
        <Link
          href="/admin"
          className="mt-6 inline-block rounded-sm bg-[linear-gradient(120deg,theme(colors.accent.DEFAULT),theme(colors.accent.deep))] px-6 py-2.5 text-sm font-medium text-[#140a0c] transition-opacity hover:opacity-90"
        >
          חזרה לרשימת העבודות
        </Link>
      </div>
    </div>
  );
}
