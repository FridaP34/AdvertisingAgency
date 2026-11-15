import Link from "next/link";

/**
 * Shown instead of the admin screens while Supabase is not connected yet.
 * It explains the one-time setup in plain Hebrew — no developer needed once
 * it has been done once.
 */
export function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center py-12">
      <div className="rounded-sm border border-line bg-surface-soft p-8 lg:p-10">
        <p className="eyebrow">הגדרה חד־פעמית</p>
        <h1 className="mt-6 text-2xl font-black text-white">אזור הניהול עדיין לא מחובר</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-dim">
          כדי לאפשר העלאת עבודות, יש לחבר את מסד הנתונים של Supabase פעם אחת. אחרי החיבור הזה
          אפשר לנהל את האתר מהדפדפן, בלי לגעת בקוד.
        </p>
        <ol className="mt-6 flex list-decimal flex-col gap-3 ps-5 text-sm leading-relaxed text-ink">
          <li>ליצור פרויקט בחינם ב־supabase.com.</li>
          <li>
            להעתיק את הערכים <code className="text-accent">Project URL</code> ו־
            <code className="text-accent">anon key</code> מדף ה־API של הפרויקט.
          </li>
          <li>
            להוסיף אותם לקובץ <code className="text-accent">.env.local</code> בשמות{" "}
            <code className="text-accent">NEXT_PUBLIC_SUPABASE_URL</code> ו־
            <code className="text-accent">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </li>
          <li>
            להריץ את <code className="text-accent">supabase/schema.sql</code> בעורך ה־SQL של
            Supabase, ולהפעיל את שרת הפיתוח מחדש.
          </li>
        </ol>
        <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-ink-faint">
          שלבי ההקמה המלאים מתועדים ב־PROJECT-PLAN.md, שלב 6.
        </p>

        <Link href="/" className="mt-6 inline-block text-sm text-accent underline-offset-4 hover:underline">
          חזרה לאתר ←
        </Link>
      </div>
    </div>
  );
}
