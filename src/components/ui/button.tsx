import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "solid" | "outline" | "ghost";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  external?: boolean;
  className?: string;
  ariaLabel?: string;
};

const base =
  "group inline-flex items-center justify-center gap-2 rounded-sm px-8 py-3.5 text-sm font-medium " +
  "transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-smooth";

const variants: Record<Variant, string> = {
  solid:
    "border border-transparent bg-[linear-gradient(120deg,theme(colors.accent.DEFAULT),theme(colors.accent.deep))] " +
    "text-[#140a0c] shadow-[0_10px_34px_-12px_theme(colors.accent.deep)] " +
    "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-12px_theme(colors.accent.deep)]",
  outline:
    "border border-line-strong text-ink hover:border-accent hover:text-accent hover:-translate-y-0.5",
  ghost: "border border-transparent text-ink-dim hover:text-accent px-0",
};

export function Button({
  href,
  children,
  variant = "solid",
  external = false,
  className,
  ariaLabel,
}: ButtonProps) {
  const classes = cn(base, variants[variant], className);
  const content = (
    <>
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block transition-transform duration-300 ease-smooth group-hover:-translate-x-1"
      >
        ←
      </span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel}>
      {content}
    </Link>
  );
}
