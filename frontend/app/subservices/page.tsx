"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";

type Service = {
  id: string | number;
  name: string;
  description?: string;
  sub_services?: unknown;
};

type Vendor = {
  id: string | number;
  service_id?: string | number;
  service_ids?: Array<string | number> | unknown;
  selected_service_names?: string[] | unknown;
  sub_services?: unknown;
};

type SubserviceCard = {
  id: string;
  name: string;
  description: string;
};

const PREDEFINED_SUBSERVICE_MAP: Record<string, string[]> = {
  ac: ["Foam jet service", "AC checkup", "AC installation", "AC uninstallation"],
  washing_machine: ["Semi automatic machine repair", "Automatic top load repair", "Automatic front load repair"],
  geyser: ["Install", "Uninstall", "Repair"],
  chimney: [],
  refrigerator: [],
  ro: [],
  microwave: [],
  heater: [],
  cooler: [],
};

const normalizeSubserviceText = (value: string) => value.trim().toLowerCase();

const getServiceKey = (serviceName: string) => {
  const normalized = normalizeSubserviceText(serviceName);

  if (normalized.includes("ac")) return "ac";
  if (normalized.includes("washing")) return "washing_machine";
  if (normalized.includes("geyser")) return "geyser";
  if (normalized.includes("chimney")) return "chimney";
  if (normalized.includes("refrigerator") || normalized.includes("fridge")) return "refrigerator";
  if (normalized.includes("ro") || normalized.includes("purifier")) return "ro";
  if (normalized.includes("microwave")) return "microwave";
  if (normalized.includes("heater")) return "heater";
  if (normalized.includes("cooler")) return "cooler";

  return normalized.replace(/\s+/g, "_");
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

const getDemandScore = (value: string) => {
  let score = 0;
  for (let index = 0; index < value.length; index += 1) {
    score += value.charCodeAt(index);
  }
  return score % 100;
};

const getSubserviceVisual = (itemId: string) => {
  const palette = [
    "linear-gradient(135deg, #f43f5e 0%, #ef4444 40%, #dc2626 100%)",
    "linear-gradient(135deg, #1d4ed8 0%, #06b6d4 48%, #0e7490 100%)",
    "linear-gradient(135deg, #16a34a 0%, #22c55e 45%, #15803d 100%)",
    "linear-gradient(135deg, #f97316 0%, #f59e0b 42%, #d97706 100%)",
  ];

  return palette[getDemandScore(itemId) % palette.length];
};

const parseVendorListField = (value: unknown): string[] => {
  const normalizeEntry = (entry: string) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return "";
    }

    if (trimmed.includes("::")) {
      return String(trimmed.split("::")[0] || "").trim();
    }

    return trimmed;
  };

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeEntry(String(item || "")))
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeEntry(String(item || "")))
          .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
      }
    } catch {
      // Fallback to comma separated values.
    }

    return normalized
      .split(",")
      .map((item) => normalizeEntry(item))
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  return [];
};

const parseServiceSubservices = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return normalized
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  return [];
};

const vendorHasService = (vendor: Vendor, service: Service | null) => {
  if (!service) {
    return true;
  }

  const targetServiceId = String(service.id);
  const targetServiceName = normalizeSubserviceText(service.name || "");

  if (String(vendor.service_id || "") === targetServiceId) {
    return true;
  }

  const vendorServiceIds = parseVendorListField((vendor as Record<string, unknown>).service_ids);
  if (vendorServiceIds.some((id) => String(id) === targetServiceId)) {
    return true;
  }

  const vendorServiceNames = parseVendorListField((vendor as Record<string, unknown>).selected_service_names);
  if (vendorServiceNames.some((name) => normalizeSubserviceText(name) === targetServiceName)) {
    return true;
  }

  return false;
};

const findBestServiceForQuery = (serviceList: Service[], query: string) => {
  if (!query) {
    return null;
  }

  const queryKey = getServiceKey(query);
  const exactKeyMatch = serviceList.find((service) => getServiceKey(service.name || "") === queryKey);
  if (exactKeyMatch) {
    return exactKeyMatch;
  }

  const best = serviceList
    .map((service) => ({
      service,
      score: getSubserviceScore(service, query),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return best && best.score >= 50 ? best.service : null;
};

const getSubserviceDescription = (name: string) => {
  const normalized = normalizeSubserviceText(name);
  if (normalized.includes("install")) return "Ideal for safe installation with complete setup checks.";
  if (normalized.includes("uninstall")) return "Best for clean removal and site-safe disconnection.";
  if (normalized.includes("repair") || normalized.includes("check")) return "Covers diagnosis and reliable issue resolution.";
  return "Trusted option for quick and reliable doorstep support.";
};

function SubservicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [highDemandOnly, setHighDemandOnly] = useState(false);

  const serviceId = searchParams.get("serviceId") || "";
  const serviceQuery = normalizeSubserviceText(searchParams.get("serviceQuery") || "");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        if (serviceId) {
          const serviceResponse = await fetch(apiUrl(`/services/${encodeURIComponent(serviceId)}`), {
            cache: "force-cache",
          });
          if (!serviceResponse.ok) {
            throw new Error(`Service API failed with ${serviceResponse.status}`);
          }

          const serviceDataRaw = await serviceResponse.json();
          const serviceData = serviceDataRaw.data || null;
          const vendorsResponse = await fetch(
            apiUrl(
              `/vendors?serviceId=${encodeURIComponent(serviceId)}&serviceName=${encodeURIComponent(
                serviceData?.name || ""
              )}&limit=100`
            ),
            { cache: "force-cache" }
          );

          if (!vendorsResponse.ok) {
            throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
          }

          const vendorsDataRaw = await vendorsResponse.json();
          const vendorsData = vendorsDataRaw.data || (Array.isArray(vendorsDataRaw) ? vendorsDataRaw : []);

          setServices(serviceData ? [serviceData] : []);
          setVendors(vendorsData);
          setErrorMessage(null);
          return;
        }

        const servicesResponse = await fetch(apiUrl("/services?limit=100"), { cache: "force-cache" });
        if (!servicesResponse.ok) {
          throw new Error(`Services API failed with ${servicesResponse.status}`);
        }

        const servicesDataRaw = await servicesResponse.json();
        const servicesData = servicesDataRaw.data || (Array.isArray(servicesDataRaw) ? servicesDataRaw : []);
        const resolvedService = findBestServiceForQuery(servicesData, serviceQuery);

        if (!resolvedService) {
          setServices(servicesData);
          setVendors([]);
          setErrorMessage(null);
          return;
        }

        const vendorsResponse = await fetch(
          apiUrl(
            `/vendors?serviceId=${encodeURIComponent(String(resolvedService.id))}&serviceName=${encodeURIComponent(
              resolvedService.name || ""
            )}&limit=100`
          ),
          { cache: "force-cache" }
        );

        if (!vendorsResponse.ok) {
          throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
        }

        const vendorsDataRaw = await vendorsResponse.json();
        const vendorsData = vendorsDataRaw.data || (Array.isArray(vendorsDataRaw) ? vendorsDataRaw : []);

        setServices(servicesData);
        setVendors(vendorsData);
        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to load sub-services", error);
        setErrorMessage("Unable to load sub-services right now. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [serviceId, serviceQuery]);

  const selectedService = useMemo(() => {
    if (serviceId) {
      return services.find((service) => String(service.id) === String(serviceId)) ?? null;
    }

    if (!serviceQuery) {
      return null;
    }

    return findBestServiceForQuery(services, serviceQuery);
  }, [services, serviceId, serviceQuery]);

  const subserviceOptions = useMemo(() => {
    if (!selectedService) {
      return [];
    }

    const serviceDefinedSubservices = parseServiceSubservices(selectedService.sub_services);
    const hasServiceDefinedSubservices = (selectedService as Record<string, unknown>).sub_services !== undefined;
    if (hasServiceDefinedSubservices) {
      return serviceDefinedSubservices;
    }

    const predefined = PREDEFINED_SUBSERVICE_MAP[getServiceKey(selectedService.name || "")] || [];
    const relatedVendors = vendors.filter((vendor) => vendorHasService(vendor, selectedService));
    const seen = new Set<string>();
    const options: string[] = [...predefined];
    predefined.forEach((item) => seen.add(normalizeSubserviceText(item)));

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

    return options;
  }, [vendors, selectedService]);

  const subserviceCards = useMemo<SubserviceCard[]>(
    () => subserviceOptions.map((name, index) => ({
      id: `${normalizeSubserviceText(name).replace(/\s+/g, "-")}-${index}`,
      name,
      description: getSubserviceDescription(name),
    })),
    [subserviceOptions]
  );

  const visibleSubservices = useMemo(() => {
    const normalizedQuery = normalizeSubserviceText(menuQuery);

    return subserviceCards.filter((item, index) => {
      const matchesQuery = !normalizedQuery
        || `${item.name} ${item.description}`.toLowerCase().includes(normalizedQuery);
      const matchesRecommended = !recommendedOnly || index < 3;
      const matchesHighDemand = !highDemandOnly || getDemandScore(item.id) >= 55;
      return matchesQuery && matchesRecommended && matchesHighDemand;
    });
  }, [highDemandOnly, menuQuery, recommendedOnly, subserviceCards]);

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
    <main className="landing mobile-page-shell service-menu-shell">
      <div className="container service-menu-wrap" style={{ maxWidth: "980px" }}>
        <header className="service-menu-header">
          <button type="button" className="service-menu-back" onClick={() => router.back()} aria-label="Back">
            ←
          </button>

          <div className="service-menu-search-wrap">
            <input
              value={menuQuery}
              onChange={(event) => setMenuQuery(event.target.value)}
              placeholder={`Search in ${(selectedService?.name || "service").toLowerCase()} plans`}
              aria-label="Search subservices"
            />
          </div>

          <button type="button" className="service-menu-kebab" aria-label="More options">⋮</button>
        </header>

        <section className="service-menu-meta">
          <h1>{selectedService ? `${selectedService.name} service plans` : "Service plans"}</h1>
          <p>Choose a plan first, then we will show matching service partners near you.</p>

          <div className="service-menu-cart-row">
            <button type="button" className="service-menu-cart-btn" onClick={continueWithoutSubservice}>Continue</button>
            <span>{visibleSubservices.length} options</span>
          </div>
        </section>

        <section className="service-offer-strip" aria-label="Service offer">
          <span className="service-offer-chip">Offers</span>
          <span>Save up to 20% on bundled service plans</span>
          <button
            type="button"
            onClick={() => {
              setRecommendedOnly(false);
              setHighDemandOnly(false);
            }}
          >
            Reset
          </button>
        </section>

        <section className="service-filter-row" aria-label="Service filters">
          <button
            type="button"
            className={`service-filter-chip ${recommendedOnly ? "active" : ""}`}
            onClick={() => setRecommendedOnly((current) => !current)}
          >
            Recommended plans
          </button>

          <button
            type="button"
            className={`service-filter-chip ${highDemandOnly ? "active" : ""}`}
            onClick={() => setHighDemandOnly((current) => !current)}
          >
            Highly rebooked
          </button>

          <button type="button" className="service-filter-chip" onClick={continueWithoutSubservice}>
            Skip and view shops
          </button>
        </section>

        {errorMessage ? <p className="checkout-error-text">{errorMessage}</p> : null}

        <section className="service-menu-section">
          {loading ? <p style={{ color: "var(--gray-500)" }}>Loading service options...</p> : null}

          {!loading && visibleSubservices.length > 0 ? (
            <>
              <h2 className="service-menu-section-title">Best Service Plans</h2>
              {visibleSubservices.map((item) => (
                <article
                  className="service-item-card"
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openShopsForSubservice(item.name)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openShopsForSubservice(item.name);
                    }
                  }}
                >
                  <div className="service-item-content">
                    <span className="service-item-badge">Verified</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <div className="service-item-note">Ideal for quick and reliable fixes.</div>
                  </div>

                  <div className="service-item-visual-wrap">
                    <div className="service-item-visual" style={{ background: getSubserviceVisual(item.id) }}>
                      <span>Service plan</span>
                    </div>

                    <button
                      type="button"
                      className="service-item-add-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        openShopsForSubservice(item.name);
                      }}
                    >
                      Choose
                    </button>
                  </div>
                </article>
              ))}
            </>
          ) : null}

          {!loading && visibleSubservices.length === 0 ? (
            <div className="service-menu-empty">
              No results found for this search/filter. Try removing a filter.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function SubservicesPage() {
  return (
    <Suspense
      fallback={
        <main className="landing" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <p style={{ color: "var(--gray-500)" }}>Loading service options...</p>
        </main>
      }
    >
      <SubservicesPageContent />
    </Suspense>
  );
}
