import { site } from "@/content/site";

type Props = {
  /** Optional link under the list, e.g. "front page CTA". */
  className?: string;
};

/**
 * The list of contact channels from site.ts.
 * Shared by the home page and the /contact page so there is one source of truth.
 */
export function ContactDetails({ className }: Props) {
  return (
    <ul className={className ?? "flex flex-col divide-y divide-line"}>
      {site.contact.channels.map((channel) => (
        <li key={channel.label} className="flex items-center justify-between gap-6 py-5">
          <span className="text-sm tracking-[0.16em] text-ink-faint">{channel.label}</span>
          {channel.href ? (
            <a
              href={channel.href}
              dir={channel.href.startsWith("mailto:") || channel.href.startsWith("tel:") ? "ltr" : undefined}
              className="text-base text-white transition-colors hover:text-accent"
            >
              {channel.value}
            </a>
          ) : (
            <span className="text-base text-ink-dim">{channel.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
