"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";
import { initializeShopCart, readShopCart } from "@/lib/shop-cart";
import {
  distanceInKm,
  geocodeArea,
  getVendorLocation,
  parseCoordinatesFromArea,
  readUserLocation,
  saveVendorLocation,
  type UserLocation,
} from "@/lib/location";

type Service = {
  id: string | number;
  name: string;
  description?: string;
  icon?: string;
};

type Vendor = {
  id: string | number;
  name?: string;
  phone?: string;
  service_id?: string | number;
  service_ids?: Array<string | number> | unknown;
  selected_service_names?: string[] | unknown;
  area?: string;
  latitude?: number;
  longitude?: number;
  experience?: number;
  is_active?: boolean;
  service_base_price?: number;
  minimum_order_value?: number;
  sub_service_prices?: unknown;
};

type PricedSubService = {
  name: string;
  price: number | null;
};

const SHOP_CARD_BACKGROUNDS = [
  "linear-gradient(135deg, #f43f5e 0%, #ef4444 42%, #b91c1c 100%)",
  "linear-gradient(135deg, #fb7185 0%, #f97316 45%, #ea580c 100%)",
  "linear-gradient(135deg, #1d4ed8 0%, #06b6d4 48%, #0e7490 100%)",
  "linear-gradient(135deg, #16a34a 0%, #22c55e 45%, #15803d 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #4f46e5 45%, #312e81 100%)",
];

const toCardVariantIndex = (vendorId: string | number) => {
  const normalized = String(vendorId);
  let total = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    total += normalized.charCodeAt(index);
  }

  return total % SHOP_CARD_BACKGROUNDS.length;
};

const toShopRating = (experience?: number) => {
  if (typeof experience !== "number") {
    return 3.8;
  }

  return Math.max(3.6, Math.min(4.9, 3.5 + experience / 12));
};

const toEtaMinutes = (distance?: number) => {
  if (typeof distance !== "number") {
    return "20-30 mins";
  }

  if (distance <= 2) {
    return "10-18 mins";
  }
  if (distance <= 5) {
    return "15-24 mins";
  }

  return "20-35 mins";
};

const toCardPrice = (experience?: number) => {
  if (typeof experience !== "number") {
    return 119;
  }

  return Math.max(99, Math.round(89 + experience * 3));
};

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
      // Fallback to comma-separated text.
    }

    return normalized.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const parsePositivePrice = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "").trim();
    if (!cleaned) {
      return null;
    }

    const numeric = Number(cleaned);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.round(numeric);
    }
  }

  return null;
};

const parseVendorSubservicePricing = (vendor: Vendor): PricedSubService[] => {
  const rawEntries = parseVendorListField((vendor as Record<string, unknown>).sub_services);
  const fallbackPriceMap = (vendor as Record<string, unknown>).sub_service_prices;

  const normalizedPriceMap = new Map<string, number>();
  if (fallbackPriceMap && typeof fallbackPriceMap === "object" && !Array.isArray(fallbackPriceMap)) {
    Object.entries(fallbackPriceMap as Record<string, unknown>).forEach(([name, value]) => {
      const normalizedName = normalizeShopText(name);
      const numericPrice = parsePositivePrice(value);
      if (normalizedName && numericPrice !== null) {
        normalizedPriceMap.set(normalizedName, numericPrice);
      }
    });
  }

  const deduped = new Map<string, PricedSubService>();

  rawEntries.forEach((entry) => {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) {
      return;
    }

    let name = trimmedEntry;
    let parsedPrice: number | null = null;

    if (trimmedEntry.includes("::")) {
      const [rawName, rawPrice] = trimmedEntry.split("::");
      name = String(rawName || "").trim();
      parsedPrice = parsePositivePrice(rawPrice);
    }

    const normalizedName = normalizeShopText(name);
    if (!normalizedName) {
      return;
    }

    const fallbackPrice = normalizedPriceMap.get(normalizedName) ?? null;
    deduped.set(normalizedName, {
      name,
      price: parsedPrice ?? fallbackPrice,
    });
  });

  return Array.from(deduped.values());
};

const normalizeShopText = (value: string) => value.trim().toLowerCase();

const vendorHasService = (vendor: Vendor, service: Service | null) => {
  if (!service) {
    return true;
  }

  const targetServiceId = String(service.id);
  const targetServiceName = normalizeShopText(service.name || "");

  if (String(vendor.service_id || "") === targetServiceId) {
    return true;
  }

  const vendorServiceIds = parseVendorListField((vendor as Record<string, unknown>).service_ids);
  if (vendorServiceIds.some((id) => String(id) === targetServiceId)) {
    return true;
  }

  const vendorServiceNames = parseVendorListField((vendor as Record<string, unknown>).selected_service_names);
  if (vendorServiceNames.some((name) => normalizeShopText(name) === targetServiceName)) {
    return true;
  }

  return false;
};

const getShopServiceScore = (service: Service, query: string) => {
  if (!query) {
    return 0;
  }

  const name = normalizeShopText(service.name || "");
  const description = normalizeShopText(service.description || "");
  const combined = `${name} ${description}`;

  let score = 0;
  if (name === query) score += 100;
  if (name.startsWith(query)) score += 70;
  if (name.includes(query)) score += 50;
  if (description.includes(query)) score += 20;
  if (query.split(/\s+/).every((word) => combined.includes(word))) score += 15;

  return score;
};

function ShopsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [vendorLocations, setVendorLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [browseQuery, setBrowseQuery] = useState("");

  const serviceId = searchParams.get("serviceId") || "";
  const serviceQuery = normalizeShopText(searchParams.get("serviceQuery") || "");
  const selectedSubServiceLabel = (searchParams.get("subService") || "").trim();
  const selectedSubService = normalizeShopText(selectedSubServiceLabel);

  useEffect(() => {
    const storedLocation = readUserLocation();
    if (storedLocation) {
      setUserLocation(storedLocation);
    }

    const existingCart = readShopCart();
    const count = existingCart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    setCartCount(count);
  }, []);

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
        console.error("Failed to load shops", error);
        setErrorMessage("Unable to load shops right now. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const selectedService = useMemo(() => {
    if (serviceId) {
      return services.find((item) => String(item.id) === String(serviceId)) ?? null;
    }

    if (!serviceQuery) {
      return null;
    }

    const best = services
      .map((service) => ({ service, score: getShopServiceScore(service, serviceQuery) }))
      .sort((left, right) => right.score - left.score)[0];

    return best && best.score > 0 ? best.service : null;
  }, [services, serviceId, serviceQuery]);

  const vendorDistances = useMemo(() => {
    if (!userLocation) {
      return {} as Record<string, number>;
    }

    const distances: Record<string, number> = {};

    Object.entries(vendorLocations).forEach(([vendorId, coords]) => {
      distances[vendorId] = distanceInKm(
        { lat: userLocation.lat, lng: userLocation.lng },
        coords
      );
    });

    return distances;
  }, [userLocation, vendorLocations]);

  const filteredVendors = useMemo(() => {
    const serviceFiltered = selectedService
      ? vendors.filter((vendor) => vendorHasService(vendor, selectedService))
      : vendors;

    const subServiceFiltered = selectedSubService
      ? serviceFiltered.filter((vendor) =>
          parseVendorListField((vendor as Record<string, unknown>).sub_services).some((item) =>
            normalizeShopText(item).includes(selectedSubService)
          )
        )
      : serviceFiltered;

    return subServiceFiltered.sort((left, right) => {
      const leftInactive = left.is_active === false ? 1 : 0;
      const rightInactive = right.is_active === false ? 1 : 0;
      if (leftInactive !== rightInactive) {
        return leftInactive - rightInactive;
      }

      const leftDistance = vendorDistances[String(left.id)] ?? Number.POSITIVE_INFINITY;
      const rightDistance = vendorDistances[String(right.id)] ?? Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    });
  }, [vendors, selectedService, selectedSubService, vendorDistances]);

  const visibleVendors = useMemo(() => {
    const normalizedQuery = browseQuery.trim().toLowerCase();

    const next = filteredVendors.filter((vendor) => {
      if (!normalizedQuery) {
        return true;
      }

      const searchable = `${vendor.name || ""} ${vendor.area || ""}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });

    return next;
  }, [filteredVendors, browseQuery]);

  const vendorSubserviceMap = useMemo(() => {
    const map: Record<string, PricedSubService[]> = {};
    vendors.forEach((vendor) => {
      map[String(vendor.id)] = parseVendorSubservicePricing(vendor);
    });
    return map;
  }, [vendors]);

  const getVendorFinalPrice = (vendor: Vendor) => {
    const parsedSubservices = vendorSubserviceMap[String(vendor.id)] || [];

    if (selectedSubService) {
      const match = parsedSubservices.find(
        (entry) => normalizeShopText(entry.name) === selectedSubService
      );

      if (match?.price) {
        return match.price;
      }
    }

    const basePrice = parsePositivePrice(vendor.service_base_price)
      ?? parsePositivePrice(vendor.minimum_order_value);
    if (basePrice !== null) {
      return basePrice;
    }

    return toCardPrice(vendor.experience);
  };

  useEffect(() => {
    if (vendors.length === 0) {
      return;
    }

    let isMounted = true;

    const resolveVendorLocations = async () => {
      const next: Record<string, { lat: number; lng: number }> = {};

      for (const vendor of vendors) {
        const vendorId = String(vendor.id);

        if (typeof vendor.latitude === "number" && typeof vendor.longitude === "number") {
          next[vendorId] = { lat: vendor.latitude, lng: vendor.longitude };
          saveVendorLocation(vendorId, {
            lat: vendor.latitude,
            lng: vendor.longitude,
            source: "stored",
            label: vendor.area || vendor.name || "Vendor location",
            savedAt: new Date().toISOString(),
          });
          continue;
        }

        const cached = getVendorLocation(vendorId);
        if (cached) {
          next[vendorId] = { lat: cached.lat, lng: cached.lng };
          continue;
        }

        const parsed = parseCoordinatesFromArea(vendor.area || "");
        if (parsed) {
          next[vendorId] = parsed;
          saveVendorLocation(vendorId, {
            lat: parsed.lat,
            lng: parsed.lng,
            source: "stored",
            label: vendor.area || vendor.name || "Vendor location",
            savedAt: new Date().toISOString(),
          });
          continue;
        }

        if (!vendor.area?.trim()) {
          continue;
        }

        try {
          const geocoded = await geocodeArea(vendor.area);
          if (geocoded) {
            next[vendorId] = { lat: geocoded.lat, lng: geocoded.lng };
            saveVendorLocation(vendorId, {
              lat: geocoded.lat,
              lng: geocoded.lng,
              source: "geocoded",
              label: geocoded.label,
              savedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Vendor geocoding failed", error);
        }

        // Respect Nominatim usage by spacing requests.
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      if (isMounted) {
        setVendorLocations(next);
      }
    };

    resolveVendorLocations();

    return () => {
      isMounted = false;
    };
  }, [vendors]);

  const openShop = (vendor: Vendor) => {
    if (vendor.is_active === false) {
      return;
    }

    const resolvedServiceId = selectedService ? String(selectedService.id) : serviceId || "service-custom";
    const resolvedServiceName = selectedService?.name || searchParams.get("serviceQuery") || "Service";
    const resolvedServiceDescription = selectedService?.description || undefined;
    const selectedPrice = getVendorFinalPrice(vendor);
    const selectedItemName = selectedSubServiceLabel || `${resolvedServiceName} Visit`;

    initializeShopCart({
      vendorId: String(vendor.id),
      vendorName: vendor.name || "Shop",
      serviceId: resolvedServiceId,
      serviceName: resolvedServiceName,
      city: vendor.area || "",
      addressLine: vendor.area || "",
      items: [
        {
          id: `selected-${selectedItemName.toLowerCase().replace(/\s+/g, "-")}`,
          name: selectedItemName,
          price: selectedPrice,
          quantity: 1,
        },
      ],
    });

    mergeBookingDraft({
      serviceId: resolvedServiceId,
      serviceName: resolvedServiceName,
      serviceDescription: resolvedServiceDescription,
      addressLine: undefined,
    });

    router.push("/checkout?step=payment");
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
                <p>Trusted Local Services</p>
              </div>
            </Link>
            <div className="shop-preorder-actions">
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/checkout")} aria-label="Cart">🛒</button>
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/bookings")} aria-label="Recent orders">🕒</button>
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/profile")} aria-label="Profile">👤</button>
            </div>
          </div>

          <div className="shop-preorder-search-row">
            <input
              value={browseQuery}
              onChange={(event) => setBrowseQuery(event.target.value)}
              placeholder={`Search ${selectedService?.name || "services"}`}
              aria-label="Search shops"
            />
            <button type="button" onClick={() => setBrowseQuery((value) => value.trim())}>search</button>
          </div>

          <div className="shop-preorder-category">
            <span>
              🏬 Verified Service Partners
              {selectedSubService ? ` for ${selectedSubServiceLabel}` : ""}
            </span>
          </div>
        </section>

        {errorMessage ? (
          <p style={{ color: "#b42318", marginTop: "0.9rem" }}>{errorMessage}</p>
        ) : null}

        {loading ? (
          <p style={{ marginTop: "1rem", color: "var(--gray-500)" }}>Loading shops...</p>
        ) : (
          <section style={{ marginTop: "1rem", display: "grid", gap: "0.8rem" }}>
            {visibleVendors.length === 0 ? (
              <div
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--gray-200)",
                  borderRadius: "14px",
                  padding: "1rem",
                  color: "var(--gray-600)",
                }}
              >
                No shops found for this service right now.
              </div>
            ) : (
              visibleVendors.map((vendor) => {
                const shopImages = parseVendorListField((vendor as Record<string, unknown>).shop_image_urls);
                const subserviceEntries = vendorSubserviceMap[String(vendor.id)] || [];
                const subServices = subserviceEntries.map((entry) => entry.name);
                const primaryImage = shopImages[0] || "";
                const isOffline = vendor.is_active === false;
                const finalPrice = getVendorFinalPrice(vendor);

                return (
                  <article
                    className="shop-feed-card"
                    key={String(vendor.id)}
                    role={isOffline ? "article" : "button"}
                    tabIndex={isOffline ? -1 : 0}
                    onClick={() => openShop(vendor)}
                    onKeyDown={(event) => {
                      if (!isOffline && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        openShop(vendor);
                      }
                    }}
                    style={{
                      cursor: isOffline ? "not-allowed" : "pointer",
                      filter: isOffline ? "grayscale(1)" : "none",
                      opacity: isOffline ? 0.88 : 1,
                    }}
                  >
                    <div
                      className="shop-feed-media"
                      style={{
                        background: SHOP_CARD_BACKGROUNDS[toCardVariantIndex(vendor.id)],
                      }}
                    >
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={`${vendor.name || "Shop"} preview`}
                          className="shop-feed-photo"
                          loading="lazy"
                        />
                      ) : (
                        <div className="shop-feed-placeholder">
                          No Photo Uploaded
                        </div>
                      )}
                      <span className="shop-feed-tag">
                        {selectedSubService
                          ? `${selectedSubServiceLabel}`
                          : `${selectedService?.name || "Service"}`}
                      </span>
                      <span className="shop-feed-save" aria-hidden="true" title="Save shop">
                        🔖
                      </span>
                      {isOffline ? (
                        <span
                          style={{
                            position: "absolute",
                            right: 10,
                            bottom: 10,
                            background: "rgba(17,24,39,0.92)",
                            color: "#fff",
                            borderRadius: 999,
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: 0.2,
                          }}
                        >
                          Not taking orders
                        </span>
                      ) : null}
                    </div>

                    <div className="shop-feed-content">
                      <div className="shop-feed-title-row">
                        <h3>{vendor.name || "Shop"}</h3>
                        <span className="shop-feed-rating">★ {toShopRating(vendor.experience).toFixed(1)}</span>
                      </div>

                      <p className="shop-feed-meta">
                        {typeof vendorDistances[String(vendor.id)] === "number"
                          ? `${toEtaMinutes(vendorDistances[String(vendor.id)]).toUpperCase()} | ${vendorDistances[String(vendor.id)].toFixed(1)} km`
                          : toEtaMinutes()}
                      </p>

                      <p className={`shop-feed-submeta ${subServices.length === 0 ? "shop-feed-submeta-empty" : ""}`}>
                        {(subServices.length > 0 ? subServices.slice(0, 3).join(" • ") : "Sub-services not added yet")}
                      </p>

                      <div className="shop-feed-footer">
                        <span className="shop-feed-price-chip shop-feed-price-chip--final">Final price ₹{finalPrice}</span>
                        <span className="shop-feed-cta">Continue</span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </div>

    </main>
  );
}

export default function ShopsPage() {
  return (
    <Suspense
      fallback={
        <main className="landing" style={{ minHeight: "100vh", padding: "6rem 0 2rem" }}>
          <div className="container" style={{ maxWidth: "100%", padding: "0 clamp(0.35rem, 2vw, 0.75rem)" }}>
            <p style={{ margin: 0, color: "var(--gray-500)" }}>Loading shops...</p>
          </div>
        </main>
      }
    >
      <ShopsPageContent />
    </Suspense>
  );
}
