import Link from "next/link";
import { site } from "@/content/site";
import { getWorks, type ResolvedWork } from "@/lib/works";
import { WorkCard } from "@/components/works/work-card";
import { Button } from "@/components/ui/button";
import { ContactDetails } from "@/components/ui/contact-details";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { DialSection, Prologue } from "@/components/ui/prologue";
import { MovementExploded } from "@/components/ui/movement-exploded";
import { ClientWall } from "@/components/ui/client-wall";
import { RoseGlow } from "@/components/ui/rose-glow";
import { cn } from "@/lib/cn";

/** Works come from the database, so the page must not be baked at build time. */
export const dynamic = "force-dynamic";

/** The three chosen for the home page, in this order, whatever the type. */
const FEATURED_SLUGS = ["papito", "shikma", "marmola"];

/**
 * Always three tiles: the chosen works that are still published, then the
 * first published works in display order to fill an empty place.
 *
 * A chosen work removed, hidden or renamed would otherwise leave a two-tile
 * row behind — a gap under a heading that promises a selection. A work with
 * no piece yet is skipped: an empty frame is not a work on show.
 */
function pickFeatured(works: ResolvedWork[]): ResolvedWork[] {
  const chosen = FEATURED_SLUGS.map((slug) => works.find((work) => work.slug === slug)).filter(
    (work): work is ResolvedWork => work !== undefined,
  );
  const used = new Set(chosen.map((work) => work.slug));
  // Booklets are not ads; the home row shows work of the same kind as its
  // chosen three, so they never fill a place here.
  const fill = works.filter(
    (work) =>
      !used.has(work.slug) &&
      work.type !== "brochure" &&
      work.assets.some((asset) => asset.type === "image" || asset.type === "pdf"),
  );
  return [...chosen, ...fill].slice(0, Math.min(3, works.length));
}

export default async function HomePage() {
  const works = await getWorks();
  const featured = pickFeatured(works);

  return (
    <>
      <RoseGlow />
      <Hero />
      <Prologue />
      <DialSection />
      <About />
      <Services />
      <FeaturedWorks works={featured} />
      <Clients />
      <Testimonials />
      <Contact />
    </>
  );
}

/* ── Hero ─────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* A warm glow behind the mechanism, tying the picture to the accent. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 end-[-8%] h-[620px] w-[620px] rounded-full bg-accent opacity-[0.08] blur-[150px]"
      />

      <div className="relative grid grid-cols-1 lg:min-h-[min(760px,calc(100svh-5rem))] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]">
        <div className="order-2 flex flex-col justify-center px-6 pb-20 pt-14 sm:px-8 lg:order-1 lg:px-12 lg:py-24">
          <Reveal>
            <p className="eyebrow">{site.brand.latinName}</p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-7 text-[clamp(2.4rem,5.2vw,4.2rem)] font-black leading-[1.02] tracking-tight">
              <span className="bg-gradient-to-b from-white to-accent bg-clip-text text-transparent">
                {site.brand.name}
              </span>
              <span className="text-accent">.</span>
            </h1>
          </Reveal>

          {/* The two lines under the brand — the question, then the line. */}
          <Reveal delay={160}>
            <p className="mt-10 text-[clamp(1.35rem,2.4vw,1.9rem)] font-bold leading-[1.35] tracking-[-0.005em] text-ink">
              {site.hero.imageCaption}
            </p>
            <p className="mt-3 text-[clamp(1.05rem,1.7vw,1.3rem)] font-normal leading-[1.55] text-ink-dim">
              {site.hero.slogan}
            </p>
          </Reveal>

          <Reveal delay={280}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button href="/works">{site.hero.ctaPrimary}</Button>
              <Button href="#contact" variant="outline">
                {site.hero.ctaSecondary}
              </Button>
            </div>
          </Reveal>
        </div>

        {/* The hero visual: the exploded watch movement, large, alive under the
            pointer. It leads on small screens and sits beside the copy on large
            ones. `data-rose-glow-off` keeps the page-wide rose light away from
            the photograph, so it never lights the picture's bounds. */}
        <div className="relative order-1 lg:order-2" data-rose-glow-off>
          <MovementExploded
            alt="מנגנון שעון מפורק לחלקיו — גלגלי שיניים, גלגל איזון ורוטור"
            className="h-[88vw] min-h-[380px] w-full max-h-[76svh] sm:h-[62vw] lg:h-full lg:max-h-none lg:min-h-[min(760px,calc(100svh-5rem))]"
          />
        </div>
      </div>
    </section>
  );
}

/* ── About ────────────────────────────────────────────────────── */
function About() {
  return (
    <section id="about" className="section border-b border-line scroll-mt-20">
      <div className="container-page grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <Reveal>
          <SectionHeading eyebrow={site.about.eyebrow} heading={site.about.heading} />
        </Reveal>

        <div className="flex flex-col gap-6">
          {site.about.paragraphs.map((paragraph, index) => (
            <Reveal key={index} delay={index * 90}>
              <p className="max-w-prose text-base leading-loose text-ink-dim sm:text-[1.05rem]">
                {paragraph}
              </p>
            </Reveal>
          ))}

          <Reveal delay={280}>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-8">
              {site.about.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[0.68rem] tracking-[0.2em] text-ink-faint">{fact.label}</dt>
                  <dd className="mt-2 text-3xl font-black text-white">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Services ─────────────────────────────────────────────────── */
function Services() {
  return (
    <section id="services" className="section border-b border-line scroll-mt-20">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow={site.services.eyebrow}
            heading={site.services.heading}
            lead={site.services.lead}
          />
        </Reveal>

        <div className="mt-16 grid gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-3">
          {site.services.items.map((service, index) => (
            <Reveal key={service.id} delay={index * 110} className="bg-surface-base">
              <article className="group flex h-full flex-col gap-5 p-8 transition-colors duration-500 hover:bg-surface-soft lg:p-10">
                <span className="flex h-12 w-12 items-center justify-center rounded-sm border border-accent/30 bg-accent-glow">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-accent"
                    aria-hidden
                  >
                    <path d={service.icon} />
                  </svg>
                </span>
                <h3 className="text-xl font-bold text-white">{service.title}</h3>
                <p className="text-sm leading-relaxed text-ink-dim">{service.description}</p>
                <Link
                  href={`/works?type=${service.id}`}
                  className="mt-auto inline-flex items-center gap-2 pt-4 text-sm text-accent transition-colors hover:text-white"
                >
                  לעבודות מהסוג הזה
                  <span aria-hidden className="transition-transform duration-300 group-hover:-translate-x-1">
                    ←
                  </span>
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Featured works ───────────────────────────────────────────── */
function FeaturedWorks({ works }: { works: ResolvedWork[] }) {
  if (works.length === 0) return null;

  return (
    <section className="section border-b border-line">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow={site.works.eyebrow}
              heading={site.works.heading}
              lead={site.works.lead}
            />
            <Button href="/works" variant="ghost">
              {site.works.archiveCta}
            </Button>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {works.map((work, index) => (
            <Reveal key={work.slug} delay={index * 100}>
              <WorkCard work={work} priority={index === 0} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Clients ──────────────────────────────────────────────────── */
function Clients() {
  return (
    <section id="clients" className="section-clients border-b border-line scroll-mt-20">
      <div className="container-page">
        <Reveal>
          <SectionHeading eyebrow={site.clients.eyebrow} heading={site.clients.heading} align="center" />
        </Reveal>

        <Reveal delay={120}>
          <ClientWall className="mt-10" />
        </Reveal>
      </div>
    </section>
  );
}

/* ── Testimonials ─────────────────────────────────────────────── */
function Testimonials() {
  return (
    <section className="section border-b border-line">
      <div className="container-page">
        <Reveal>
          <SectionHeading eyebrow={site.testimonials.eyebrow} heading={site.testimonials.heading} />
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {site.testimonials.items.map((item, index) => (
            <Reveal key={item.author + index} delay={index * 110}>
              <figure className="flex h-full flex-col gap-6 rounded-sm border border-line bg-surface-soft p-8">
                <blockquote className="text-[1.02rem] leading-[1.9] text-ink">
                  <span aria-hidden className="text-accent">
                    „
                  </span>
                  {item.quote}
                  <span aria-hidden className="text-accent">
                    ”
                  </span>
                </blockquote>
                <figcaption className="mt-auto border-t border-line pt-5 text-sm">
                  <span className="block font-bold text-white">{item.author}</span>
                  <span className="mt-1 block text-xs leading-relaxed tracking-[0.14em] text-ink-faint">
                    {item.role}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Contact ──────────────────────────────────────────────────── */
function Contact() {
  return (
    <section id="contact" className="section relative overflow-hidden scroll-mt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute end-[-15%] top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-accent opacity-[0.07] blur-[120px]"
      />
      <div className="container-page relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <SectionHeading
            eyebrow={site.contact.eyebrow}
            heading={site.contact.heading}
            lead={site.contact.lead}
          />
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-sm border border-line bg-surface-soft p-8 lg:p-10">
            <ContactDetails />
            <Button href="/contact" className="mt-8 w-full">
              {site.contact.cta}
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
