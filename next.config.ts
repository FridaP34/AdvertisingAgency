import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        // Supabase Storage — the only host the site ever loads files from.
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Both are native/binary packages: bundling them breaks their internals,
  // so Next loads them from node_modules at runtime.
  serverExternalPackages: ["mupdf", "sharp"],
  // A PDF is sent to `/admin/api/pdf` as one multipart request, and Next keeps
  // only the first 10MB of a body unless told otherwise — a larger booklet then
  // arrived cut in half and failed to parse. The ceiling here matches the
  // 24MB limit the route and the form already enforce, plus room for the form.
  experimental: {
    middlewareClientMaxBodySize: "26mb",
  },
  poweredByHeader: false,
  reactStrictMode: true,
  // HSTS is added by Vercel; the rest of the standard set is ours to send.
  // `X-Frame-Options` and `frame-ancestors` both go out because one browser or
  // proxy in the visitor's chain may honour only one of them.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Content-Security-Policy",
            // The site loads no analytics, no embeds and no Google Fonts; the
            // only outside host it talks to is Supabase Storage.
            value: [
              "default-src 'self'",
              // Next injects inline bootstrap scripts, so inline JS is needed.
              // `blob:` is for the worker chunk Next splits out at runtime.
              "script-src 'self' 'unsafe-inline' blob:",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
