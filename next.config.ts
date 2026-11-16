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
};

export default nextConfig;
