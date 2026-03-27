import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable compression for all responses
  compress: true,

  // Image optimization settings
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1 year for versioned images
  },

  // Next.js v16 manages minification automatically. Remove swcMinify in strict typed config.
  // Using custom package optimization as needed via bundler tools (no experimental config required).

  // HTTP response headers for caching
  headers: async () => {
    return [
      {
        source: "/services/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=3600" },
        ],
      },
      {
        source: "/vendors/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=1800, s-maxage=1800" },
        ],
      },
      {
        source: "/_next/image(|static)/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // Keep a single canonical host for stronger SEO signals.
  redirects: async () => {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.servicego.works",
          },
        ],
        destination: "https://servicego.works/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
