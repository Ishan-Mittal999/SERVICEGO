import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/auth",
          "/booking",
          "/bookings",
          "/cart",
          "/checkout",
          "/profile",
          "/vendor/dashboard",
          "/vendor/login",
          "/vendor/onboarding",
        ],
      },
    ],
    sitemap: "https://servicego.works/sitemap.xml",
    host: "https://servicego.works",
  };
}
