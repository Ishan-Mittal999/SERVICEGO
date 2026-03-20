"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";

type Service = {
  id: string | number;
  name: string;
  description?: string;
};

type Vendor = {
  id: string | number;
  service_id?: string | number;
  sub_services?: unknown;
};

const normalizeSubserviceText = (value: string) => value.trim().toLowerCase();

const parseVendorListField = (value: unknown): string[] => {
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
      // Fallback to comma separated values.
    }

    return normalized.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const getSubserviceScore = (service: Service, query: string) => {
  if (!query) {
    return 0;
  }

  const name = normalizeSubserviceText(service.name || "");
  const description = normalizeSubserviceText(service.description || "");
  const combined = `${name} ${description}`;

  let score = 0;
  if (name === query) score += 100;
  if (name.startsWith(query)) score += 70;
  if (name.includes(query)) score += 50;
  if (description.includes(query)) score += 20;
  if (query.split(/\s+/).every((word) => combined.includes(word))) score += 15;

  return score;
};

function SubservicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const serviceId = searchParams.get("serviceId") || "";
  const serviceQuery = normalizeSubserviceText(searchParams.get("serviceQuery") || "");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [servicesResponse, vendorsResponse] = await Promise.all([
          fetch(apiUrl("/services"), { cache: "no-store" }),
          fetch(apiUrl("/vendors"), { cache: "no-store" }),
        ]);

        if (!servicesResponse.ok) {
          throw new Error(`Services API failed with ${servicesResponse.status}`);
        }

        if (!vendorsResponse.ok) {
          throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
        }

        const [servicesData, vendorsData] = await Promise.all([
          servicesResponse.json(),
          vendorsResponse.json(),
        ]);

        setServices(Array.isArray(servicesData) ? servicesData : []);
        setVendors(Array.isArray(vendorsData) ? vendorsData : []);
        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to load sub-services", error);
        setErrorMessage("Unable to load sub-services right now. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const selectedService = useMemo(() => {
    if (serviceId) {
      return services.find((service) => String(service.id) === String(serviceId)) ?? null;
    }

    if (!serviceQuery) {
      return null;
    }

    const best = services
      .map((service) => ({
        service,
        score: getSubserviceScore(service, serviceQuery),
      }))
      .sort((left, right) => right.score - left.score)[0];

    return best && best.score > 0 ? best.service : null;
  }, [services, serviceId, serviceQuery]);

  const subserviceOptions = useMemo(() => {
    if (!selectedService) {
      return [];
    }

    const relatedVendors = vendors.filter(
      (vendor) => String(vendor.service_id) === String(selectedService.id)
    );

    const seen = new Set<string>();
    const options: string[] = [];

    relatedVendors.forEach((vendor) => {
      parseVendorListField(vendor.sub_services).forEach((item) => {
        const normalized = normalizeSubserviceText(item);
        if (!normalized || seen.has(normalized)) {
          return;
        }

        seen.add(normalized);
        options.push(item);
      });
    });

    return options.sort((left, right) => left.localeCompare(right));
  }, [vendors, selectedService]);

  const openShopsForSubservice = (subService: string) => {
    if (!selectedService) {
      router.push(`/shops?serviceQuery=${encodeURIComponent(subService)}`);
      return;
    }

    mergeBookingDraft({
      serviceId: String(selectedService.id),
      serviceName: selectedService.name,
      serviceDescription: selectedService.description,
    });

    router.push(
      `/shops?serviceId=${encodeURIComponent(String(selectedService.id))}&subService=${encodeURIComponent(subService)}`
    );
  };

  const continueWithoutSubservice = () => {
    if (selectedService) {
      mergeBookingDraft({
        serviceId: String(selectedService.id),
        serviceName: selectedService.name,
        serviceDescription: selectedService.description,
      });

      router.push(`/shops?serviceId=${encodeURIComponent(String(selectedService.id))}`);
      return;
    }

    if (serviceQuery) {
      router.push(`/shops?serviceQuery=${encodeURIComponent(serviceQuery)}`);
      return;
    }

    router.push("/shops");
  };

  return (
    <main
      className="landing mobile-page-shell shops-mobile-shell"
      style={{
        minHeight: "100vh",
        padding: "0.75rem 0 2rem",
        background:
          "radial-gradient(circle at 85% 10%, rgba(122,106,0,0.12), transparent 36%), radial-gradient(circle at 15% 14%, rgba(30,144,255,0.1), transparent 35%), var(--off-white)",
      }}
    >
      <div className="container" style={{ maxWidth: "100%", padding: "0 clamp(0.35rem, 2vw, 0.75rem)" }}>
        <section className="shop-preorder-hero">
          <div className="shop-preorder-topbar">
            <Link href="/" className="shop-preorder-brand" aria-label="Go to homepage">
              <img src="/newwlogo.png" alt="ServiceGo" className="shop-preorder-logo" />
              <div>
                <strong>Service<span>Go</span></strong>
                <p>Choose sub-service first</p>
              </div>
            </Link>
            <div className="shop-preorder-actions">
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/checkout")} aria-label="Cart">🛒</button>
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/bookings")} aria-label="Recent orders">🕒</button>
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/profile")} aria-label="Profile">👤</button>
            </div>
          </div>

          <div className="shop-preorder-category">
            <span>🧰 {selectedService ? `Sub-services for ${selectedService.name}` : "Choose a sub-service"}</span>
          </div>
        </section>

        {errorMessage ? (
          <p style={{ color: "#b42318", marginTop: "0.9rem" }}>{errorMessage}</p>
        ) : null}

        {loading ? (
          <p style={{ marginTop: "1rem", color: "var(--gray-500)" }}>Loading sub-services...</p>
        ) : (
          <section style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
            {subserviceOptions.length > 0 ? (
              <div className="subservice-grid">
                {subserviceOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="subservice-chip"
                    onClick={() => openShopsForSubservice(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--gray-200)",
                  borderRadius: "14px",
                  padding: "1rem",
                  color: "var(--gray-600)",
                }}
              >
                No sub-services configured for this category yet. You can continue to view shops.
              </div>
            )}

            <button type="button" className="subservice-continue" onClick={continueWithoutSubservice}>
              Continue to shops
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

export default function SubservicesPage() {
  return (
    <Suspense
      fallback={
        <main className="landing" style={{ minHeight: "100vh", padding: "6rem 0 2rem" }}>
          <div className="container" style={{ maxWidth: "100%", padding: "0 clamp(0.35rem, 2vw, 0.75rem)" }}>
            <p style={{ margin: 0, color: "var(--gray-500)" }}>Loading sub-services...</p>
          </div>
        </main>
      }
    >
      <SubservicesPageContent />
    </Suspense>
  );
}
