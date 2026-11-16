import type { Metadata, Viewport } from "next";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

// Fonts are self-hosted from /public/fonts (see @font-face in globals.css)
// so the build and the site never depend on fetching Google Fonts at runtime.

// 1200×630, paper background, brand wordmark and the rose tab mark.
const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: `${site.brand.name} — ${site.meta.title}`,
};

export const metadata: Metadata = {
  title: {
    default: site.meta.title,
    template: `%s · ${site.brand.name}`,
  },
  description: site.meta.description,
  metadataBase: new URL(siteUrl()),
  alternates: { canonical: "/" },
  // One share card for both networks, served from /public. It is a plain PNG
  // rather than an ImageResponse route because satori (behind ImageResponse)
  // cannot read a woff2 font, and the brand's only Hebrew face is woff2 — the
  // letter would have come out as a box, or the build would have failed.
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: site.brand.name,
    title: site.meta.title,
    description: site.meta.description,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: site.meta.title,
    description: site.meta.description,
    images: [SHARE_IMAGE],
  },
  robots: { index: true, follow: true },
  // The tab mark is `icon.svg`, picked up by convention.
  icons: { icon: "/icon.svg" },
};

// The theme colour lives here rather than in `metadata`: Next.js only reads it
// from the viewport export, and warns on every page that sets it in metadata.
export const viewport: Viewport = {
  themeColor: "#141110",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // The `js` class is added by the script below, before React loads, so React
  // is told not to compare that attribute — otherwise every page warns about it.
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Enable scroll-reveal styles only when JS is available. */}
        <script
          // Runs before first paint so there is no flash of hidden content.
          dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js')` }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
