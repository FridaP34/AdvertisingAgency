"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

const links = [
  { href: "/#about", label: site.nav.about },
  { href: "/#services", label: site.nav.services },
  { href: "/works", label: site.nav.works },
  { href: "/#clients", label: site.nav.clients },
  { href: "/#contact", label: site.nav.contact },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-500",
        scrolled
          ? "border-line bg-surface-base/85 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-20 items-center justify-between gap-6">
        <Link href="/" className="group flex flex-col leading-none" aria-label={site.brand.name}>
          <span className="text-lg font-black tracking-tight text-white transition-colors group-hover:text-accent">
            {site.brand.name}
          </span>
          <span className="mt-1 text-[0.62rem] tracking-[0.32em] text-ink-faint">
            {site.brand.role}
          </span>
        </Link>

        <nav aria-label="ניווט ראשי" className="hidden items-center gap-9 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-dim transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/#contact"
            className="hidden rounded-sm border border-accent/60 px-6 py-2.5 text-sm text-accent transition-colors duration-300 hover:bg-accent hover:text-surface-base lg:inline-flex"
          >
            {site.contact.cta}
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
          >
            <span
              className={cn(
                "block h-px w-6 bg-ink transition-transform duration-300",
                open && "translate-y-[3.5px] rotate-45",
              )}
            />
            <span
              className={cn(
                "block h-px w-6 bg-ink transition-transform duration-300",
                open && "-translate-y-[3.5px] -rotate-45",
              )}
            />
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        className={cn(
          "overflow-hidden border-t border-line bg-surface-base/95 backdrop-blur-xl transition-[max-height,opacity] duration-500 ease-smooth lg:hidden",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav aria-label="ניווט למכשיר נייד" className="container-page flex flex-col py-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border-b border-line py-3.5 text-base text-ink-dim transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
