import Link from "next/link";
import { redirect } from "next/navigation";
import { site } from "@/content/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "@/components/admin/login-form";

type PageProps = { searchParams: Promise<{ next?: string }> };

/** Only same-site admin paths are accepted as a post-login destination. */
function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) return "/admin";
  return value;
}

export default async function LoginPage({ searchParams }: PageProps) {
  // Without Supabase there is nothing to log in to — the admin page explains setup.
  if (!isSupabaseConfigured()) redirect("/admin");

  const { next } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-16 lg:py-24">
      <p className="eyebrow">אזור אישי</p>
      <h1 className="mt-6 text-3xl font-black text-white">התחברות</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-dim">
        הכניסה מיועדת לבעלת העסק בלבד. השם והסיסמה נקבעים פעם אחת, בעת יצירת המשתמש ב־Supabase.
      </p>

      <div className="mt-10 rounded-sm border border-line bg-surface-soft p-8">
        <LoginForm next={safeNext(next)} />
      </div>

      <Link href="/" className="mt-8 text-center text-sm text-ink-dim transition-colors hover:text-accent">
        חזרה לאתר · {site.brand.name}
      </Link>
    </div>
  );
}
