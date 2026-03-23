import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable compression for all responses
  compress: true,

  // Image optimization settings
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1 year for versioned images
  },

  // Enable SWC minification (faster builds and smaller bundle)
  swcMinify: true,

  // Optimize package imports - code-split heavy libraries
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js"],
  },

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
};

export default nextConfig;
