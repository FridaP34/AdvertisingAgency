import Link from "next/link";
import { site } from "@/content/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface-base">
      <div className="container-page flex flex-col gap-10 py-14 md:flex-row md:items-end md:justify-between">
        <div className="max-w-sm">
          <p className="text-2xl font-black tracking-tight text-white">
            {site.brand.name}
            <span className="text-accent">.</span>
          </p>
        </div>

        <nav aria-label="ניווט תחתון" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link href="/works" className="text-ink-dim transition-colors hover:text-accent">
            {site.nav.works}
          </Link>
          <Link href="/#services" className="text-ink-dim transition-colors hover:text-accent">
            {site.nav.services}
          </Link>
          <Link href="/#contact" className="text-ink-dim transition-colors hover:text-accent">
            {site.nav.contact}
          </Link>
        </nav>
      </div>

      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
        <span>
          {site.footer.copyright} · {year}
        </span>
        <span>{site.footer.credit}</span>
      </div>
    </footer>
  );
}
