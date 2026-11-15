import type { Metadata, Viewport } from "next";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

// Fonts are self-hosted from /public/fonts (see @font-face in globals.css)
// so the build and the site never depend on fetching Google Fonts at runtime.

export const metadata: Metadata = {
  title: {
    default: site.meta.title,
    template: `%s · ${site.brand.name}`,
  },
  description: site.meta.description,
  metadataBase: new URL(siteUrl()),
  alternates: { canonical: "/" },
  // The share preview is a file rather than a rendered picture: it is drawn
  // once, stays the same for every page, and needs no fonts at request time.
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: site.brand.name,
    title: site.meta.title,
    description: site.meta.description,
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: site.meta.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: site.meta.title,
    description: site.meta.description,
    images: ["/opengraph-image.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
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
