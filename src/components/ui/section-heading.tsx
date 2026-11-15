import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  eyebrow: string;
  heading: string;
  lead?: string;
  align?: "start" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  heading,
  lead,
  align = "start",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <p className={cn("eyebrow", align === "center" && "justify-center after:block after:h-px after:w-8 after:bg-accent/70")}>
        {eyebrow}
      </p>
      <h2 className="heading-section max-w-[26ch]">{heading}</h2>
      {lead ? (
        <p className={cn("max-w-prose text-base leading-relaxed text-ink-dim sm:text-lg", align === "center" && "mx-auto")}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
