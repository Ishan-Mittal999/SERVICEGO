import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/checkout", "/bookings", "/admin", "/vendor/dashboard"],
      },
    ],
    sitemap: "https://servicego.works/sitemap.xml",
    host: "https://servicego.works",
  };
}
