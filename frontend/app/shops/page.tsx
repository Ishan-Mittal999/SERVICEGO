"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";
import { readShopCart } from "@/lib/shop-cart";
import {
  detectUserLocation,
  distanceInKm,
  geocodeArea,
  getVendorLocation,
  parseCoordinatesFromArea,
  readUserLocation,
  saveVendorLocation,
  writeUserLocation,
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
  area?: string;
  latitude?: number;
  longitude?: number;
  experience?: number;
  is_active?: boolean;
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

const toShopOffer = (experience?: number) => {
  if (typeof experience !== "number") {
    return "50% OFF on selected services";
  }

  const offer = Math.min(60, Math.max(35, 20 + experience));
  const cap = 120 + Math.max(0, experience * 4);
  return `${offer}% OFF up to Rs${cap}`;
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

function ShopsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [radiusKm, setRadiusKm] = useState(15);
  const [vendorLocations, setVendorLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [isResolvingVendors, setIsResolvingVendors] = useState(false);
  const [browseQuery, setBrowseQuery] = useState("");

  const serviceId = searchParams.get("serviceId") || "";
  const radiusOptions = [5, 10, 15, 25, 50];

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

  const selectedService = useMemo(
    () => services.find((item) => String(item.id) === String(serviceId)) ?? null,
    [services, serviceId]
  );

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
    const serviceFiltered = vendors.filter((vendor) => String(vendor.service_id) === String(serviceId));

    if (!nearbyOnly || !userLocation) {
      return serviceFiltered.sort((left, right) => {
        const leftInactive = left.is_active === false ? 1 : 0;
        const rightInactive = right.is_active === false ? 1 : 0;
        return leftInactive - rightInactive;
      });
    }

    const distanceFiltered = serviceFiltered.filter((vendor) => {
      const vendorId = String(vendor.id);
      const distance = vendorDistances[vendorId];
      return typeof distance === "number" && distance <= radiusKm;
    });

    return distanceFiltered.sort((left, right) => {
      const leftInactive = left.is_active === false ? 1 : 0;
      const rightInactive = right.is_active === false ? 1 : 0;
      if (leftInactive !== rightInactive) {
        return leftInactive - rightInactive;
      }

      const leftDistance = vendorDistances[String(left.id)] ?? Number.POSITIVE_INFINITY;
      const rightDistance = vendorDistances[String(right.id)] ?? Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    });
  }, [vendors, serviceId, nearbyOnly, userLocation, vendorDistances, radiusKm]);

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

  const detectAndSaveUserLocation = async () => {
    try {
      setIsDetectingLocation(true);
      const detected = await detectUserLocation();
      writeUserLocation(detected);
      setUserLocation(detected);
      setNearbyOnly(true);
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to detect location", error);
      setErrorMessage("Location access denied or unavailable. Showing all shops.");
      setNearbyOnly(false);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    if (!userLocation) {
      detectAndSaveUserLocation();
    }
    // First-time ask only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  useEffect(() => {
    if (vendors.length === 0) {
      return;
    }

    let isMounted = true;

    const resolveVendorLocations = async () => {
      setIsResolvingVendors(true);

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
        setIsResolvingVendors(false);
      }
    };

    resolveVendorLocations();

    return () => {
      isMounted = false;
    };
  }, [vendors]);

  const openShop = (vendor: Vendor) => {
    if (!selectedService) {
      return;
    }

    mergeBookingDraft({
      serviceId: String(selectedService.id),
      serviceName: selectedService.name,
      serviceDescription: selectedService.description,
      addressLine: undefined,
    });

    if (vendor.is_active === false) {
      return;
    }

    router.push(`/shops/${encodeURIComponent(String(vendor.id))}?serviceId=${encodeURIComponent(String(selectedService.id))}`);
  };

  return (
    <main
      className="landing mobile-page-shell"
      style={{
        minHeight: "100vh",
        padding: "6rem 0 2rem",
        background:
          "radial-gradient(circle at 85% 10%, rgba(122,106,0,0.12), transparent 36%), radial-gradient(circle at 15% 14%, rgba(30,144,255,0.1), transparent 35%), var(--off-white)",
      }}
    >
      <div className="container" style={{ maxWidth: "100%", padding: "0 clamp(0.35rem, 2vw, 0.75rem)" }}>
        <section className="shop-preorder-hero">
          <div className="shop-preorder-topbar">
            <button type="button" className="shop-preorder-close" onClick={() => router.push("/")}>✕</button>
            <div className="shop-preorder-brand">
              <div className="shop-preorder-avatar" aria-hidden="true">{selectedService?.icon || "S"}</div>
              <div>
                <strong>ServiceGo</strong>
                <p>Trusted Local Services</p>
              </div>
            </div>
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
            <span>🏬 Verified Service Partners</span>
          </div>
        </section>

        <section className="shop-browse-controls">
          <div className="shop-classic-filter-row" aria-label="Shop filters">
            <label className="shop-classic-nearby">
              <input
                type="checkbox"
                checked={nearbyOnly}
                onChange={(event) => setNearbyOnly(event.target.checked)}
                disabled={!userLocation}
              />
              Nearby only
            </label>

            <select
              value={radiusKm}
              onChange={(event) => {
                setRadiusKm(Number(event.target.value));
                setNearbyOnly(true);
              }}
              disabled={!userLocation || !nearbyOnly}
              className="shop-classic-radius"
            >
              {radiusOptions.map((radius) => (
                <option key={radius} value={radius}>
                  Within {radius} km
                </option>
              ))}
            </select>
          </div>

          <p className="shop-controls-note">
            {userLocation
              ? `Current location: ${userLocation.area || userLocation.city || "Detected"}${userLocation.postcode ? ` - ${userLocation.postcode}` : ""}`
              : "Allow location once to enable nearby filtering. Saved for future visits."}
            <button
              type="button"
              className="shop-controls-inline-action"
              onClick={detectAndSaveUserLocation}
            >
              {isDetectingLocation ? "Detecting..." : userLocation ? "Update" : "Use location"}
            </button>
          </p>

          <p className="shop-controls-note shop-controls-note--muted">
            {isResolvingVendors
              ? "Resolving vendor locations for distance sorting..."
              : "Choose a shop to continue your booking."}
          </p>
        </section>

        {errorMessage ? (
          <p style={{ color: "#b42318", marginTop: "0.9rem" }}>{errorMessage}</p>
        ) : null}

        {loading ? (
          <p style={{ marginTop: "1rem", color: "var(--gray-500)" }}>Loading shops...</p>
        ) : (
          <section style={{ marginTop: "1rem", display: "grid", gap: "0.8rem" }}>
            <div className="shop-discount-strip" role="note" aria-label="Discount offer">
              <span className="shop-discount-icon" aria-hidden="true">*</span>
              <span>60% OFF up to Rs140 above Rs159</span>
            </div>

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
                {nearbyOnly && userLocation
                  ? `No shops found within ${radiusKm} km. Increase radius or turn off nearby filter.`
                  : "No shops found for this service right now."}
              </div>
            ) : (
              visibleVendors.map((vendor) => {
                const shopImages = parseVendorListField((vendor as Record<string, unknown>).shop_image_urls);
                const subServices = parseVendorListField((vendor as Record<string, unknown>).sub_services);
                const primaryImage = shopImages[0] || "";
                const isOffline = vendor.is_active === false;

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
                        <div
                          style={{
                            height: 166,
                            display: "grid",
                            placeItems: "center",
                            color: "rgba(255,255,255,0.9)",
                            fontWeight: 700,
                            letterSpacing: 0.2,
                          }}
                        >
                          No Photo Uploaded
                        </div>
                      )}
                      <span className="shop-feed-tag">
                        {`${selectedService?.name || "Service"} · ₹${toCardPrice(vendor.experience)}`}
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

                      <p className="shop-feed-submeta">
                        {(subServices.length > 0 ? subServices.slice(0, 3).join(" • ") : "Sub-services not added yet")}
                      </p>

                      <p className="shop-feed-offer">
                        {isOffline ? "⚫ Currently offline" : `⚙ ${toShopOffer(vendor.experience)}`}
                      </p>
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
