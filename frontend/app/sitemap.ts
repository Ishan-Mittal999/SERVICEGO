import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://servicego.works";
  const now = new Date();

  const paths = [
    "",
    "/subservices",
    "/shops",
    "/bookings",
    "/checkout",
    "/faqs",
    "/terms",
    "/privacy",
    "/cancellation-refund-policy",
  ];

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.8,
  }));
}
