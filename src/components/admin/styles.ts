import { cn } from "@/lib/cn";

/** Shared form control styling for the admin screens. */
export const adminFieldClass = cn(
  "w-full rounded-sm border border-line bg-surface-base px-4 py-2.5 text-sm text-ink",
  "placeholder:text-ink-faint transition-colors duration-200",
  "hover:border-line-strong focus:border-accent focus:outline-none",
);

export const adminLabelClass = "text-xs tracking-[0.18em] text-ink-faint";

export const adminCardClass = "rounded-sm border border-line bg-surface-soft";
