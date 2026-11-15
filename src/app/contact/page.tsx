import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { ContactDetails } from "@/components/ui/contact-details";
import { ContactForm } from "@/components/ui/contact-form";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: site.nav.contact,
  description: site.contact.lead,
};

export default function ContactPage() {
  return (
    <div className="border-b border-line">
      <div className="container-page pb-24 pt-16 lg:pt-24">
        <Reveal>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-dim transition-colors hover:text-accent"
          >
            <span aria-hidden>→</span>
            {site.nav.home}
          </Link>
          <p className="eyebrow mt-10">{site.contact.eyebrow}</p>
          <h1 className="mt-6 max-w-[20ch] font-sans text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {site.contact.heading}
          </h1>
          <p className="mt-6 max-w-prose text-base leading-relaxed text-ink-dim sm:text-lg">
            {site.contact.lead}
          </p>
        </Reveal>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
          <Reveal>
            <div className="rounded-sm border border-line bg-surface-soft p-8">
              <ContactDetails />
              <p className="mt-6 text-xs leading-relaxed text-ink-faint">
                אפשר גם להשאיר פרטים בטופס שמול, ונחזור אליכם בהקדם.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="rounded-sm border border-line bg-surface-soft p-8 lg:p-10">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
