import Link from "next/link";
import { site } from "@/content/site";

/** A work that was removed, renamed, or never existed. */
export default function WorkNotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <p className="eyebrow">לא נמצא</p>
      <h1 className="mt-6 text-3xl font-black text-white sm:text-4xl">העבודה הזו אינה זמינה</h1>
      <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-dim">
        ייתכן שהעבודה הוסרה או שהכתובת השתנתה. כל העבודות נמצאות בתיק העבודות.
      </p>
      <Link
        href="/works"
        className="mt-10 inline-flex rounded-sm border border-accent/60 px-7 py-3 text-sm text-accent transition-colors duration-300 hover:bg-accent hover:text-surface-base"
      >
        {site.works.detailBack}
      </Link>
    </div>
  );
}
