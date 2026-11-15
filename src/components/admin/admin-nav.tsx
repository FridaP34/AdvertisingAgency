"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// One place per action: "new work" lives only as the button on the works page.
const items = [{ href: "/admin", label: "עבודות", exact: true }];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="ניווט באזור הניהול" className="flex items-center gap-1">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm transition-colors",
              active ? "bg-accent-glow text-accent" : "text-ink-dim hover:text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
