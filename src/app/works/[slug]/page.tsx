import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/content/site";
import { getWorkReadings, getWorks } from "@/lib/works";
import { WorkCard } from "@/components/works/work-card";
import { WorkAssets } from "@/components/works/work-assets";
import { Reveal } from "@/components/ui/reveal";

type PageProps = { params: Promise<{ slug: string }> };

/** Works come from the database, so the page must not be baked at build time. */
export const dynamic = "force-dynamic";
// An edited work must show its new text on the next visit, never a copy kept
// from the previous render, so the page is never stored as static output.
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = await getWorkReadings(slug);
  if (!work) return {};

  return {
    title: work.title,
    description: work.summary,
    alternates: { canonical: `/works/${work.slug}` },
    openGraph: {
      type: "article",
      title: work.title,
      description: work.summary,
      images: [{ url: work.cover.src, alt: work.title }],
    },
  };
}

export default async function WorkPage({ params }: PageProps) {
  const { slug } = await params;
  const work = await getWorkReadings(slug);
  if (!work) notFound();

  const related = (await getWorks()).filter((w) => w.slug !== work.slug).slice(0, 3);

  return (
    <article className="pb-24">
      {/* Header */}
      <header className="border-b border-line">
        <div className="container-page py-14 lg:py-20">
          <Reveal>
            <Link
              href="/works"
              className="inline-flex items-center gap-2 text-sm text-ink-dim transition-colors hover:text-accent"
            >
              <span aria-hidden>→</span>
              {site.works.detailBack}
            </Link>

            {work.client ? (
              <p className="mt-10 text-[0.72rem] tracking-[0.28em] text-accent">{work.client}</p>
            ) : null}
            <h1 className="mt-4 max-w-[22ch] font-sans text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {work.title}
            </h1>
            <p className="mt-6 max-w-prose text-base leading-relaxed text-ink-dim sm:text-lg">
              {work.summary}
            </p>

            <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-4 border-t border-line pt-6 text-sm">
              {work.client ? (
                <div>
                  <dt className="text-[0.68rem] tracking-[0.2em] text-ink-faint">לקוח</dt>
                  <dd className="mt-1 text-white">{work.client}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[0.68rem] tracking-[0.2em] text-ink-faint">תחום</dt>
                <dd className="mt-1 text-white">{work.category}</dd>
              </div>
              {work.year ? (
                <div>
                  <dt className="text-[0.68rem] tracking-[0.2em] text-ink-faint">שנה</dt>
                  <dd className="mt-1 text-white">{work.year}</dd>
                </div>
              ) : null}
            </dl>
          </Reveal>
        </div>
      </header>

      <div className="container-page">
        {/* Story — only for campaigns that come with a narrative */}
        {work.story ? (
          <Reveal className="mx-auto mt-16 max-w-3xl border-r-2 border-accent/40 pr-6 lg:pr-8">
            <p className="text-lg leading-loose text-ink">{work.story}</p>
          </Reveal>
        ) : null}

        {/* Pieces — print-sized, click to open full screen */}
        <div className="mt-20">
          <WorkAssets
            assets={work.assets}
            title={work.title}
            kind={work.type === "brochure" ? "brochure" : "presentation"}
          />
        </div>
      </div>

      {/* Related */}
      {related.length > 0 ? (
        <section className="container-page mt-28 border-t border-line pt-16">
          <h2 className="text-2xl font-bold text-white">עוד עבודות</h2>
          <div className="mx-auto mt-10 grid max-w-gallery gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-7">
            {related.map((item) => (
              <WorkCard key={item.slug} work={item} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
