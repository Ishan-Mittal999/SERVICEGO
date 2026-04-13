import type { MetadataRoute } from "next";
import { apiUrl } from "@/lib/env";

type VendorSummary = {
  id: string | number;
};

type VendorsResponse = {
  data?: VendorSummary[];
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://servicego.works";
  const now = new Date();

  const routes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/shops", changeFrequency: "daily", priority: 0.9 },
    { path: "/subservices", changeFrequency: "daily", priority: 0.9 },
    { path: "/faqs", changeFrequency: "monthly", priority: 0.7 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.5 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.5 },
    { path: "/cancellation-refund-policy", changeFrequency: "yearly", priority: 0.6 },
    { path: "/vendor/entry", changeFrequency: "monthly", priority: 0.6 },
    { path: "/vendor/signup", changeFrequency: "monthly", priority: 0.6 },
  ];

  let vendorRoutes: MetadataRoute.Sitemap = [];

  try {
    const response = await fetch(apiUrl("/vendors?limit=1000"), {
      next: { revalidate: 1800 },
    });

    if (response.ok) {
      const payload = (await response.json()) as VendorsResponse;
      const vendors = Array.isArray(payload.data) ? payload.data : [];

      vendorRoutes = vendors
        .filter((vendor) => vendor && vendor.id !== undefined && vendor.id !== null)
        .map((vendor) => ({
          url: `${baseUrl}/shops/${encodeURIComponent(String(vendor.id))}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.8,
        }));
    }
  } catch {
    vendorRoutes = [];
  }

  const staticRoutes = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  return [...staticRoutes, ...vendorRoutes];
}
