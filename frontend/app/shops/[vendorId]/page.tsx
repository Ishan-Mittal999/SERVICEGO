import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiUrl } from "@/lib/env";

type VendorRecord = {
  id: string | number;
  name?: string | null;
  area?: string | null;
  experience?: number | null;
  rating_average?: number | null;
  rating_count?: number | null;
  selected_service_names?: string[] | unknown;
};

type VendorApiResponse = {
  data?: VendorRecord;
};

type PageProps = {
  params: Promise<{ vendorId: string }>;
};

export const revalidate = 1800;

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");

const parseServiceNames = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      // Treat as a comma-separated list.
    }

    return normalized
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const fetchVendor = async (vendorId: string): Promise<VendorRecord | null> => {
  try {
    const response = await fetch(apiUrl(`/vendors/${encodeURIComponent(vendorId)}`), {
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as VendorApiResponse;
    return payload.data || null;
  } catch {
    return null;
  }
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vendorId } = await params;
  const vendor = await fetchVendor(vendorId);

  if (!vendor) {
    return {
      title: "Shop Not Found",
      description: "The requested ServiceGo shop page could not be found.",
      robots: {
        index: false,
        follow: false,
      },
      alternates: {
        canonical: `/shops/${vendorId}`,
      },
    };
  }

  const vendorName = vendor.name?.trim() || `ServiceGo Partner ${vendorId}`;
  const area = vendor.area?.trim() || "your area";
  const serviceNames = parseServiceNames(vendor.selected_service_names);
  const primaryService = serviceNames[0] || "home services";

  return {
    title: `${vendorName} in ${area}`,
    description: `Book ${toTitleCase(primaryService)} with ${vendorName} on ServiceGo in ${area}. View ratings, experience, and availability.`,
    alternates: {
      canonical: `/shops/${vendorId}`,
    },
    openGraph: {
      title: `${vendorName} in ${area} | ServiceGo`,
      description: `Trusted ServiceGo partner for ${toTitleCase(primaryService)} in ${area}.`,
      url: `https://servicego.works/shops/${vendorId}`,
      type: "profile",
      siteName: "ServiceGo",
    },
    twitter: {
      card: "summary",
      title: `${vendorName} in ${area} | ServiceGo`,
      description: `Trusted ServiceGo partner for ${toTitleCase(primaryService)} in ${area}.`,
    },
  };
}

export default async function VendorShopPage({ params }: PageProps) {
  const { vendorId } = await params;
  const vendor = await fetchVendor(vendorId);

  if (!vendor) {
    notFound();
  }

  const vendorName = vendor.name?.trim() || `ServiceGo Partner ${vendorId}`;
  const area = vendor.area?.trim() || "Not specified";
  const experience = typeof vendor.experience === "number" ? vendor.experience : null;
  const ratingAverage =
    typeof vendor.rating_average === "number" && Number.isFinite(vendor.rating_average)
      ? vendor.rating_average
      : null;
  const ratingCount = typeof vendor.rating_count === "number" ? vendor.rating_count : 0;
  const serviceNames = parseServiceNames(vendor.selected_service_names);

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendorName,
    areaServed: area,
    url: `https://servicego.works/shops/${vendorId}`,
    aggregateRating:
      ratingAverage !== null && ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(ratingAverage.toFixed(1)),
            ratingCount,
          }
        : undefined,
    makesOffer:
      serviceNames.length > 0
        ? serviceNames.map((serviceName) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: toTitleCase(serviceName),
            },
          }))
        : undefined,
    provider: {
      "@type": "Organization",
      name: "ServiceGo",
      url: "https://servicego.works",
    },
  };

  return (
    <main className="landing legal-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <div className="container legal-wrap">
        <article className="legal-card">
          <h1 className="section-title">{vendorName}</h1>
          <p className="legal-intro">
            Trusted ServiceGo partner serving {area}.
          </p>

          <section className="legal-sections">
            <h2>Shop Overview</h2>
            <p>
              <strong>Area:</strong> {area}
            </p>
            <p>
              <strong>Experience:</strong> {experience !== null ? `${experience}+ years` : "Available on request"}
            </p>
            <p>
              <strong>Customer Rating:</strong>{" "}
              {ratingAverage !== null ? `${ratingAverage.toFixed(1)} / 5 (${ratingCount} ratings)` : "Not enough ratings yet"}
            </p>

            {serviceNames.length > 0 ? (
              <>
                <h2>Services Offered</h2>
                <ul className="legal-list">
                  {serviceNames.map((serviceName) => (
                    <li key={serviceName}>{toTitleCase(serviceName)}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          <div className="legal-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/shops" className="btn-book">
              Browse All Shops
            </Link>
            <Link href="/" className="btn-book" style={{ background: "#fff", color: "#0f172a" }}>
              Back to Home
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}