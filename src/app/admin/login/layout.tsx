import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";

/**
 * The login page sits outside the admin shell on purpose: before signing in
 * there is no admin navigation to show, and the page should stay a quiet,
 * single-purpose screen.
 */
export const metadata: Metadata = {
  title: "התחברות",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" className="text-sm font-black text-white transition-colors hover:text-accent">
            {site.brand.name}
          </Link>
        </div>
      </header>
      <main className="container-page flex-1">{children}</main>
    </div>
  );
}
