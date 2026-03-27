import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://servicego.works/sitemap.xml",
    host: "https://servicego.works",
  };
}
