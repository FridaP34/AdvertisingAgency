import type { Metadata } from "next";
import { Suspense } from "react";
import { site } from "@/content/site";
import { getWorks } from "@/lib/works";
import { WorkGallery } from "@/components/works/work-gallery";
import { Reveal } from "@/components/ui/reveal";

/** Works come from the database, so the page must not be baked at build time. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: site.nav.works,
  description: site.works.lead,
  alternates: { canonical: "/works" },
};

export default async function WorksPage() {
  const works = await getWorks();

  return (
    <div className="container-page pb-24 pt-20 lg:pt-28">
      <Reveal>
        <p className="eyebrow">{site.works.eyebrow}</p>
        <h1 className="mt-6 font-sans text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {site.works.heading}
        </h1>
        <p className="mt-5 max-w-prose text-base leading-relaxed text-ink-dim sm:text-lg">
          {site.works.lead}
        </p>
      </Reveal>

      <div className="mt-14">
        {/* The gallery reads the ?type= filter from the URL. */}
        <Suspense fallback={<div className="min-h-[400px]" />}>
          <WorkGallery works={works} />
        </Suspense>
      </div>
    </div>
  );
}
