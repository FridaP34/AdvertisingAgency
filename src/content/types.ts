/**
 * Shapes of every editable text block on the public site.
 *
 * Nothing user-facing is hard-coded inside components: each page reads its
 * copy from a `SiteContent` object (see `site.ts`). When the admin panel
 * lands, the same object will be served from the database instead of a file,
 * so the component layer will not change.
 */

export type WorkType = "single-ad" | "teaser" | "branding" | "brochure";

export type ServiceItem = {
  /** Anchor id, also used to match the work-type filter. */
  id: WorkType;
  title: string;
  description: string;
  /** Inline SVG path data (24×24 viewBox) for the service icon. */
  icon: string;
};

export type SiteContent = {
  meta: {
    /** Browser tab / search result title. */
    title: string;
    description: string;
  };

  brand: {
    /** Hebrew display name — always visible. */
    name: string;
    /** Latin signature — used as a small overline. */
    latinName: string;
    role: string;
  };

  nav: {
    home: string;
    about: string;
    services: string;
    works: string;
    clients: string;
    contact: string;
  };

  hero: {
    /** The question set just under the brand. */
    imageCaption: string;
    /** The second line under the brand — nothing else follows it. */
    slogan: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };

  /** The opening story after the hero, and the wheel that closes it. */
  prologue: {
    /** One line per row, set large — the lines as written. */
    lines: string[];
    /** The results, one line per row; the last one is the quieter continuation. */
    results: string[];
    /** Above the wheel: a question and its invitation to turn it. */
    invitation: string[];
    /** Screen-reader description of the wheel. */
    dialLabel: string;
  };


  about: {
    eyebrow: string;
    heading: string;
    /** Two or three short paragraphs. */
    paragraphs: string[];
    /** Short numeric facts, e.g. "12 שנות ניסיון". */
    facts: { value: string; label: string }[];
  };

  services: {
    eyebrow: string;
    heading: string;
    lead: string;
    items: ServiceItem[];
  };

  works: {
    eyebrow: string;
    heading: string;
    lead: string;
    filterAll: string;
    archiveCta: string;
    emptyState: string;
    detailBack: string;
  };

  clients: {
    eyebrow: string;
    heading: string;
    /**
     * The client wall: name plus a short field ("בגדי תינוקות"), set in type.
     * Add `logo` once an image of the mark is ready (put it in
     * `public/clients/`) and the cell shows it instead of the name.
     */
    names: { name: string; field?: string; logo?: string }[];
    /** The last cell of the wall, e.g. "ועוד רבים". */
    more: string;
  };

  testimonials: {
    eyebrow: string;
    heading: string;
    items: {
      quote: string;
      author: string;
      role: string;
    }[];
  };

  contact: {
    eyebrow: string;
    heading: string;
    lead: string;
    cta: string;
    /** Contact channels, in display order. */
    channels: {
      label: string;
      value: string;
      /** `tel:` / `mailto:` / `https:` href, or null for plain text. */
      href: string | null;
    }[];
  };

  footer: {
    copyright: string;
    credit: string;
  };
};
