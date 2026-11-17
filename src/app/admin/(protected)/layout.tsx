import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireAdminUser } from "@/lib/admin/require-user";
import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Admin shell.
 *
 * The public site's header and footer are replaced by a compact admin bar, so
 * it is always obvious that you are inside the management area. Access is
 * enforced here, through `requireAdminUser()`, for every page under `/admin`;
 * `robots.ts` keeps the area out of search engines.
 *
 * This file lives in `admin/(protected)/`, a route group that adds nothing to
 * the URL. The group exists so the guarding shell wraps the admin pages only:
 * `/admin/login` sits in `admin/(public)/login/` and is never wrapped by it.
 * (When both pages shared the plain `admin/` folder, this layout wrapped the
 * login page too, the guard redirected to `/admin/login`, and the browser
 * looped on that redirect — ERR_TOO_MANY_REDIRECTS.)
 */
export const metadata: Metadata = {
  title: {
    default: "אזור ניהול",
    template: `%s · ניהול ${site.brand.name}`,
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Without Supabase there is nothing to sign in to, and the setup notice
  // explains that better than a login that could not work.
  if (isSupabaseConfigured()) await requireAdminUser();

  return (
    <div className="flex min-h-screen flex-col bg-surface-base">
      <header className="border-b border-line bg-surface-soft">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-black text-white transition-colors hover:text-accent">
              ניהול · {site.brand.name}
            </Link>
            <AdminNav />
          </div>
          <Link
            href="/"
            target="_blank"
            className="text-xs tracking-[0.16em] text-ink-dim transition-colors hover:text-accent"
          >
            צפייה באתר ↗
          </Link>
        </div>
      </header>
      <main className="container-page flex-1 py-16 lg:py-20">{children}</main>
    </div>
  );
}
