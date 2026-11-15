import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Admin shell.
 *
 * The public site's header and footer are replaced by a compact admin bar, so
 * it is always obvious that you are inside the management area. Access is
 * enforced in `middleware.ts`. `robots.ts` keeps it out of search engines.
 */
export const metadata: Metadata = {
  title: {
    default: "אזור ניהול",
    template: `%s · ניהול ${site.brand.name}`,
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
