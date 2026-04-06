"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { SubserviceDetail } from "@/components/SubserviceDetail";

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

type SubserviceItem = {
  name: string;
  included?: string[] | string;
  notIncluded?: string[] | string;
  note?: string;
};

type SubserviceCard = {
  id: string;
  name: string;
  isDetailed: boolean;
  details?: SubserviceItem;
  imageSrc?: string;
};

type SubservicesCachePayload = {
  services: Service[];
  vendors: Vendor[];
};

const SUBSERVICES_CACHE_TTL_MS = 5 * 60 * 1000;

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

const SERVICE_SUBSERVICE_KEYWORDS: Record<string, string[]> = {
  ac: ["ac", "air conditioner", "cooling"],
  washing_machine: ["washing", "machine", "top load", "front load"],
  geyser: ["geyser", "water heater", "heater"],
  chimney: ["chimney"],
  refrigerator: ["fridge", "refrigerator"],
  ro: ["ro", "purifier", "water filter"],
  microwave: ["microwave", "oven"],
  heater: ["heater"],
  cooler: ["cooler"],
};

const SUBSERVICE_IMAGE_FILES = [
  "AC-form-service.webp",
  "AC-install (1).webp",
  "ac-normal_service.webp",
  "AC-rent-service.webp",
  "AC-service.webp",
  "AC-unistallation.webp",
  "ac_gas_refilling (1).webp",
  "Air Cooler Check-up.webp",
  "auto-front-repair.webp",
  "auto-top-repair.webp",
  "chimney -service.webp",
  "chimney checkup.webp",
  "Chimney Deep Cleaning.webp",
  "chimney normal cleaning.webp",
  "chimney-install.webp",
  "chimney-uninstall.webp",
  "Cooler Pad Replacement.webp",
  "deep-cleaning-front-load.webp",
  "deep-cleaning-top-load.webp",
  "Double Door Fridge Gas Charging.webp",
  "Fridge Check-up & Diagnosis.webp",
  "geyser-install.webp",
  "geyser-uninstalled.webp",
  "normal-cleaning-top-load-washing-machine.webp",
  "RO Purifier Check-up.webp",
  "RO-service.webp",
  "Side-by-Side (Almirah) Fridge Check-up.webp",
  "Single Door Fridge Gas Chargin.webp",
] as const;

const SUBSERVICE_TOKEN_ALIASES: Record<string, string> = {
  ac: "ac",
  conditioner: "ac",
  form: "foam",
  check: "checkup",
  diagnosis: "checkup",
  diagnostic: "checkup",
  installing: "install",
  installation: "install",
  uninstalling: "uninstall",
  uninstallation: "uninstall",
  uninstalled: "uninstall",
  unistallation: "uninstall",
  refilling: "charging",
  refill: "charging",
  chargin: "charging",
  auto: "automatic",
  almirah: "side",
  up: "checkup",
};

const SERVICE_IMAGE_HINTS: Record<string, string[]> = {
  ac: ["ac", "foam", "cooling", "gas", "install", "uninstall"],
  washing_machine: ["washing", "machine", "automatic", "front", "top", "load", "cleaning", "repair"],
  geyser: ["geyser", "heater", "install", "uninstall", "repair"],
  chimney: ["chimney", "cleaning", "checkup", "install", "uninstall"],
  refrigerator: ["fridge", "refrigerator", "door", "charging", "checkup"],
  ro: ["ro", "purifier", "checkup", "service"],
  microwave: ["microwave", "oven"],
  heater: ["heater"],
  cooler: ["cooler", "pad", "checkup"],
};

const normalizeImageKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toCanonicalToken = (token: string) => {
  const normalizedToken = token.trim().toLowerCase();
  return SUBSERVICE_TOKEN_ALIASES[normalizedToken] || normalizedToken;
};

const tokenizeImageKey = (value: string) =>
  normalizeImageKey(value)
    .split(" ")
    .map(toCanonicalToken)
    .filter(Boolean);

const scoreImageMatch = (subserviceName: string, fileName: string, serviceName: string) => {
  const subTokens = tokenizeImageKey(subserviceName);
  const fileTokens = new Set(tokenizeImageKey(fileName));
  const serviceTokens = SERVICE_IMAGE_HINTS[getServiceKey(serviceName)] || [];

  if (subTokens.length === 0 || fileTokens.size === 0) {
    return 0;
  }

  const normalizedSubservice = subTokens.join(" ");
  const normalizedFile = Array.from(fileTokens).join(" ");

  if (normalizedSubservice === normalizedFile) {
    return 100;
  }

  if (normalizedFile.includes(normalizedSubservice) || normalizedSubservice.includes(normalizedFile)) {
    return 70;
  }

  const sharedTokenCount = subTokens.filter((token) => fileTokens.has(token)).length;
  if (sharedTokenCount === 0) {
    return 0;
  }

  let score = Math.round((sharedTokenCount / subTokens.length) * 60);

  const serviceBoost = serviceTokens.filter((token) => fileTokens.has(toCanonicalToken(token))).length;
  score += serviceBoost * 8;

  return score;
};

const getSubserviceImagePath = (subserviceName: string, serviceName: string) => {
  const bestMatch = SUBSERVICE_IMAGE_FILES
    .map((fileName) => ({
      fileName,
      score: scoreImageMatch(subserviceName, fileName, serviceName),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (!bestMatch || bestMatch.score < 15) {
    return undefined;
  }

  return `/Subservices/${encodeURIComponent(bestMatch.fileName)}`;
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

const getSubserviceVisual = (itemId: string) => {
  const palette = [
    "linear-gradient(135deg, #f43f5e 0%, #ef4444 40%, #dc2626 100%)",
    "linear-gradient(135deg, #1d4ed8 0%, #06b6d4 48%, #0e7490 100%)",
    "linear-gradient(135deg, #16a34a 0%, #22c55e 45%, #15803d 100%)",
    "linear-gradient(135deg, #f97316 0%, #f59e0b 42%, #d97706 100%)",
  ];

  let score = 0;
  for (let index = 0; index < itemId.length; index += 1) {
    score += itemId.charCodeAt(index);
  }

  return palette[score % palette.length];
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

const parseServiceSubservices = (value: unknown): SubserviceItem[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        // If it's a detailed object with name property
        if (typeof item === "object" && item !== null && "name" in item) {
          return item as SubserviceItem;
        }
        // If it's a simple string, convert to basic SubserviceItem
        const nameStr = String(item || "").trim();
        if (nameStr && nameStr.toLowerCase() !== "null" && nameStr.toLowerCase() !== "undefined") {
          return { name: nameStr };
        }
        return null;
      })
      .filter((item) => item !== null) as SubserviceItem[];
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
          .map((item) => {
            if (typeof item === "object" && item !== null && "name" in item) {
              return item as SubserviceItem;
            }
            const nameStr = String(item || "").trim();
            if (nameStr && nameStr.toLowerCase() !== "null" && nameStr.toLowerCase() !== "undefined") {
              return { name: nameStr };
            }
            return null;
          })
          .filter((item) => item !== null) as SubserviceItem[];
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return normalized
      .split(",")
      .map((item) => {
        const nameStr = item.trim();
        return nameStr ? { name: nameStr } : null;
      })
      .filter((item) => item !== null) as SubserviceItem[];
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

const isSubserviceRelevantToService = (
  subserviceName: string,
  service: Service,
  predefinedForService: string[]
) => {
  const normalizedSubservice = normalizeSubserviceText(subserviceName);
  if (!normalizedSubservice) {
    return false;
  }

  const normalizedPredefined = predefinedForService.map((item) => normalizeSubserviceText(item));
  if (
    normalizedPredefined.some(
      (entry) =>
        entry === normalizedSubservice
        || normalizedSubservice.includes(entry)
        || entry.includes(normalizedSubservice)
    )
  ) {
    return true;
  }

  const serviceKey = getServiceKey(service.name || "");
  const keywords = SERVICE_SUBSERVICE_KEYWORDS[serviceKey] || [normalizeSubserviceText(service.name || "")];
  return keywords.some((keyword) => keyword && normalizedSubservice.includes(keyword));
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

  const serviceId = searchParams.get("serviceId") || "";
  const serviceQuery = normalizeSubserviceText(searchParams.get("serviceQuery") || "");
  const serviceName = (searchParams.get("serviceName") || "").trim();

  useEffect(() => {
    const loadData = async () => {
      const cacheKey = `subservices:${serviceId}:${serviceQuery}`;
      const cachedPayload = readClientCache<SubservicesCachePayload>(cacheKey, SUBSERVICES_CACHE_TTL_MS);
      const hasCachedPayload = Boolean(cachedPayload);

      if (hasCachedPayload && cachedPayload) {
        setServices(cachedPayload.services);
        setVendors(cachedPayload.vendors);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        if (serviceId) {
          const [serviceResponse, vendorsResponse] = await Promise.all([
            fetch(apiUrl(`/services/${encodeURIComponent(serviceId)}`), {
              cache: "force-cache",
            }),
            fetch(
              apiUrl(
                `/vendors?serviceId=${encodeURIComponent(serviceId)}&serviceName=${encodeURIComponent(
                  serviceName
                )}&limit=100`
              ),
              { cache: "force-cache" }
            ),
          ]);

          if (!serviceResponse.ok) {
            throw new Error(`Service API failed with ${serviceResponse.status}`);
          }

          if (!vendorsResponse.ok) {
            throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
          }

          const serviceDataRaw = await serviceResponse.json();
          const serviceData = serviceDataRaw.data || null;
          const vendorsDataRaw = await vendorsResponse.json();
          let vendorsData = vendorsDataRaw.data || (Array.isArray(vendorsDataRaw) ? vendorsDataRaw : []);

          if (!serviceName && vendorsData.length === 0 && serviceData?.name) {
            const fallbackVendorsResponse = await fetch(
              apiUrl(
                `/vendors?serviceId=${encodeURIComponent(serviceId)}&serviceName=${encodeURIComponent(
                  serviceData.name
                )}&limit=100`
              ),
              { cache: "force-cache" }
            );

            if (fallbackVendorsResponse.ok) {
              const fallbackVendorsDataRaw = await fallbackVendorsResponse.json();
              vendorsData = fallbackVendorsDataRaw.data || (Array.isArray(fallbackVendorsDataRaw) ? fallbackVendorsDataRaw : []);
            }
          }

          const nextServices = serviceData ? [serviceData] : [];

          setServices(nextServices);
          setVendors(vendorsData);
          setErrorMessage(null);
          writeClientCache(cacheKey, {
            services: nextServices,
            vendors: vendorsData,
          });
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
        writeClientCache(cacheKey, {
          services: servicesData,
          vendors: vendorsData,
        });
      } catch (error) {
        console.error("Failed to load sub-services", error);
        if (!hasCachedPayload) {
          setErrorMessage("Unable to load sub-services right now. Please try again.");
        }
      } finally {
        if (!hasCachedPayload) {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [serviceId, serviceName, serviceQuery]);

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
    const options: SubserviceItem[] = predefined.map((item) => ({ name: item }));
    predefined.forEach((item) => seen.add(normalizeSubserviceText(item)));

    relatedVendors.forEach((vendor) => {
      parseVendorListField(vendor.sub_services).forEach((item) => {
        const normalized = normalizeSubserviceText(item);
        if (!normalized || seen.has(normalized)) {
          return;
        }

        if (!isSubserviceRelevantToService(item, selectedService, predefined)) {
          return;
        }
        seen.add(normalized);
        options.push({ name: item });
      });
    });

    return options;
  }, [vendors, selectedService]);

  const subserviceCards = useMemo<SubserviceCard[]>(
    () => subserviceOptions.map((item, index) => ({
      id: `${normalizeSubserviceText(item.name).replace(/\s+/g, "-")}-${index}`,
      name: item.name,
      isDetailed: Boolean(item.included || item.notIncluded || item.note),
      details: item,
      imageSrc: getSubserviceImagePath(item.name, selectedService?.name || ""),
    })),
    [subserviceOptions, selectedService]
  );

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
      `/shops?serviceId=${encodeURIComponent(String(selectedService.id))}&serviceName=${encodeURIComponent(
        selectedService.name || ""
      )}&subService=${encodeURIComponent(subService)}`
    );
  };

  return (
    <main className="landing mobile-page-shell shops-mobile-shell">
      <div className="container service-menu-wrap" style={{ maxWidth: "980px" }}>
        <section className="shop-preorder-hero" style={{ paddingTop: "0.85rem" }}>
          <div className="shop-preorder-category">
            <span>
              🏬 Verified Service Plans
              {selectedService ? ` for ${selectedService.name}` : ""}
            </span>
          </div>
        </section>

        {errorMessage ? <p className="checkout-error-text">{errorMessage}</p> : null}

        <section className="service-menu-section">
          {loading ? <p style={{ color: "var(--gray-500)" }}>Loading service options...</p> : null}

          {!loading && subserviceCards.length > 0 ? (
            <>
              <h2 className="service-menu-section-title">Best Service Plans</h2>
              {subserviceCards.map((item) => {
                if (item.isDetailed && item.details) {
                  return (
                    <SubserviceDetail
                      key={item.id}
                      item={item.details}
                      onSelect={() => openShopsForSubservice(item.name)}
                      visualGradient={getSubserviceVisual(item.id)}
                      imageSrc={item.imageSrc}
                    />
                  );
                }

                // Fallback to simple card for non-detailed subservices
                return (
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
                      <p>{getSubserviceDescription(item.name)}</p>
                      <div className="service-item-note">Ideal for quick and reliable fixes.</div>
                    </div>

                    <div className="service-item-visual-wrap">
                      <div className="service-item-visual" style={{ background: getSubserviceVisual(item.id) }}>
                        {item.imageSrc ? (
                          <img
                            src={item.imageSrc}
                            alt={item.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: "12px",
                            }}
                          />
                        ) : (
                          <span>Service plan</span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="service-item-add-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          openShopsForSubservice(item.name);
                        }}
                      >
                        Select
                      </button>
                    </div>
                  </article>
                );
              })}
            </>
          ) : null}

          {!loading && subserviceCards.length === 0 ? (
            <div className="service-menu-empty">
              No sub-services found for this service right now.
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
