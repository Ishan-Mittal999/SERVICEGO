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

type QuickFilter = "all" | "near" | "top" | "offers";

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

const SHOP_CARD_IMAGES = [
  "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1565299585323-38174c4a6ca5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=80",
];

const SERVICE_IMAGE_LIBRARY: Record<string, string[]> = {
  plumbing: [
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1631545806609-e2f6a5f0f3fe?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
  ],
  electrical: [
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555963966-b7ae5404b6ed?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1616627454822-4d1ef127f8d7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  ],
  cleaning: [
    "https://images.unsplash.com/photo-1581578731563-015f66f4f3cc?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=1200&q=80",
  ],
  ac: [
    "https://images.unsplash.com/photo-1558618047-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
  ],
  default: SHOP_CARD_IMAGES,
};

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

const getServiceKey = (serviceName?: string) => {
  const normalized = (serviceName || "").toLowerCase();

  if (normalized.includes("plumb")) {
    return "plumbing";
  }
  if (normalized.includes("elect")) {
    return "electrical";
  }
  if (normalized.includes("clean")) {
    return "cleaning";
  }
  if (normalized.includes("ac") || normalized.includes("air")) {
    return "ac";
  }

  return "default";
};

const DISCOVERY_PILLS = ["Regular", "Popular", "Express", "Top picks", "New"];

function ShopsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addressLine, setAddressLine] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [radiusKm, setRadiusKm] = useState(15);
  const [vendorLocations, setVendorLocations] = useState<Record<string, { lat: number; lng: number }>>({});
  const [isResolvingVendors, setIsResolvingVendors] = useState(false);
  const [browseQuery, setBrowseQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [carouselTick, setCarouselTick] = useState(0);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [draftQuickFilter, setDraftQuickFilter] = useState<QuickFilter>("all");
  const [draftNearbyOnly, setDraftNearbyOnly] = useState(true);
  const [draftRadiusKm, setDraftRadiusKm] = useState(15);

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

  const serviceImages = useMemo(() => {
    const key = getServiceKey(selectedService?.name);
    return SERVICE_IMAGE_LIBRARY[key] ?? SERVICE_IMAGE_LIBRARY.default;
  }, [selectedService?.name]);

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
    const activeFiltered = serviceFiltered.filter((vendor) => vendor.is_active !== false);

    if (!nearbyOnly || !userLocation) {
      return activeFiltered;
    }

    const distanceFiltered = activeFiltered.filter((vendor) => {
      const vendorId = String(vendor.id);
      const distance = vendorDistances[vendorId];
      return typeof distance === "number" && distance <= radiusKm;
    });

    return distanceFiltered.sort((left, right) => {
      const leftDistance = vendorDistances[String(left.id)] ?? Number.POSITIVE_INFINITY;
      const rightDistance = vendorDistances[String(right.id)] ?? Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    });
  }, [vendors, serviceId, nearbyOnly, userLocation, vendorDistances, radiusKm]);

  const visibleVendors = useMemo(() => {
    const normalizedQuery = browseQuery.trim().toLowerCase();

    let next = filteredVendors.filter((vendor) => {
      if (!normalizedQuery) {
        return true;
      }

      const searchable = `${vendor.name || ""} ${vendor.area || ""}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });

    if (quickFilter === "top") {
      next = [...next].sort((left, right) => toShopRating(right.experience) - toShopRating(left.experience));
    } else if (quickFilter === "offers") {
      next = [...next].sort((left, right) => {
        const leftOffer = typeof left.experience === "number" ? left.experience : 0;
        const rightOffer = typeof right.experience === "number" ? right.experience : 0;
        return rightOffer - leftOffer;
      });
    } else if (quickFilter === "near") {
      next = [...next].sort((left, right) => {
        const leftDistance = vendorDistances[String(left.id)] ?? Number.POSITIVE_INFINITY;
        const rightDistance = vendorDistances[String(right.id)] ?? Number.POSITIVE_INFINITY;
        return leftDistance - rightDistance;
      });
    }

    return next;
  }, [filteredVendors, browseQuery, quickFilter, vendorDistances]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselTick((tick) => tick + 1);
    }, 2400);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isFilterSheetOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterSheetOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isFilterSheetOpen]);

  useEffect(() => {
    if (!isFilterSheetOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFilterSheetOpen]);

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
      addressLine: addressLine.trim(),
    });

    router.push(`/shops/${encodeURIComponent(String(vendor.id))}?serviceId=${encodeURIComponent(String(selectedService.id))}`);
  };

  const openFilterSheet = () => {
    setDraftQuickFilter(quickFilter);
    setDraftNearbyOnly(nearbyOnly);
    setDraftRadiusKm(radiusKm);
    setIsFilterSheetOpen(true);
  };

  const applySheetFilters = () => {
    setQuickFilter(draftQuickFilter);
    setNearbyOnly(draftNearbyOnly);
    setRadiusKm(draftRadiusKm);
    setIsFilterSheetOpen(false);
  };

  const resetSheetFilters = () => {
    setDraftQuickFilter("all");
    setDraftNearbyOnly(false);
    setDraftRadiusKm(15);
  };

  return (
    <main
      className="landing mobile-page-shell"
      style={{
        minHeight: "100vh",
        padding: "6rem 1rem 2rem",
        background:
          "radial-gradient(circle at 85% 10%, rgba(122,106,0,0.12), transparent 36%), radial-gradient(circle at 15% 14%, rgba(30,144,255,0.1), transparent 35%), var(--off-white)",
      }}
    >
      <div className="container" style={{ maxWidth: "980px" }}>
        <section className="shop-preorder-hero">
          <div className="shop-preorder-topbar">
            <button type="button" className="shop-preorder-close" onClick={() => router.push("/")}>✕</button>
            <div className="shop-preorder-brand">
              <div className="shop-preorder-avatar" aria-hidden="true">{selectedService?.icon || "S"}</div>
              <div>
                <strong>Preorder</strong>
                <p>servicego.works/shops</p>
              </div>
            </div>
            <div className="shop-preorder-actions">
              <button type="button" className="shop-preorder-action-icon" aria-label="Notifications">🔔</button>
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/checkout")} aria-label="Cart">🛒</button>
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/bookings")} aria-label="Recent orders">🕒</button>
              <button type="button" className="shop-preorder-action-icon" onClick={() => router.push("/profile")} aria-label="Profile">👤</button>
            </div>
          </div>

          <div className="shop-preorder-search-row">
            <input
              value={browseQuery}
              onChange={(event) => setBrowseQuery(event.target.value)}
              placeholder="Search for tasty stuff"
              aria-label="Search shops"
            />
            <button type="button" onClick={() => setQuickFilter("all")}>search</button>
          </div>

          <div className="shop-preorder-category">
            <span>🏫 College Canteens</span>
          </div>
        </section>

        <section className="shop-browse-controls">
          <div className="shop-discovery-tags" aria-label="Quick tags">
            <button
              type="button"
              className="shop-discovery-filter-btn"
              aria-label="Open filters"
              onClick={openFilterSheet}
            >
              Filters
            </button>
            {[
              { key: "near", label: "Near & Fast" },
              { key: "top", label: "Top Rated" },
              { key: "offers", label: "Deals" },
              { key: "all", label: "New to you" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`shop-discovery-tag ${quickFilter === item.key ? "active" : ""}`}
                onClick={() => setQuickFilter(item.key as QuickFilter)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="shop-cuisine-row" aria-label="Discovery categories">
            {DISCOVERY_PILLS.map((pill, index) => (
              <button
                key={pill}
                type="button"
                className={`shop-cuisine-pill ${index === 0 ? "active" : ""}`}
              >
                {pill}
              </button>
            ))}
          </div>

          <div className="shop-classic-filter-row" aria-label="Shop filters">
            <button
              type="button"
              onClick={detectAndSaveUserLocation}
              className="shop-classic-detect"
            >
              {isDetectingLocation ? "Detecting location..." : userLocation ? "Update location" : "Use location"}
            </button>

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

          <input
            value={addressLine}
            onChange={(event) => setAddressLine(event.target.value)}
            placeholder="Add full address for checkout"
            className="shop-address-input"
          />

          <p className="shop-controls-note">
            {userLocation
              ? `Current location: ${userLocation.area || userLocation.city || "Detected"}${userLocation.postcode ? ` - ${userLocation.postcode}` : ""}`
              : "Allow location once to enable nearby filtering. Saved for future visits."}
          </p>

          <p className="shop-controls-note shop-controls-note--muted">
            {isResolvingVendors
              ? "Resolving vendor locations for distance sorting..."
              : "Address is optional now and can still be edited at checkout."}
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
                  : "No active shops found for this service right now."}
              </div>
            ) : (
              visibleVendors.map((vendor) => {
                const imageOffset = toCardVariantIndex(vendor.id);
                const activeImageIndex = (carouselTick + imageOffset) % serviceImages.length;
                const activeImage = serviceImages[activeImageIndex];

                return (
                  <article
                    className="shop-feed-card"
                    key={String(vendor.id)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openShop(vendor)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openShop(vendor);
                      }
                    }}
                  >
                    <div
                      className="shop-feed-media"
                      style={{
                        background: SHOP_CARD_BACKGROUNDS[toCardVariantIndex(vendor.id)],
                      }}
                    >
                      <img
                        src={activeImage}
                        alt={`${vendor.name || "Shop"} preview`}
                        className="shop-feed-photo"
                        loading="lazy"
                      />
                      <span className="shop-feed-tag">
                        {toShopOffer(vendor.experience)}
                      </span>
                      <span className="shop-feed-save" aria-hidden="true">
                        Save
                      </span>
                      <div className="shop-feed-media-mark" aria-hidden="true">
                        {selectedService?.icon || "Shop"}
                      </div>
                      <div className="shop-feed-dots" aria-hidden="true">
                        {serviceImages.map((image, index) => (
                          <span
                            key={`${image}-${index}`}
                            className={index === activeImageIndex ? "active" : ""}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="shop-feed-content">
                      <div className="shop-feed-title-row">
                        <h3>{vendor.name || "Shop"}</h3>
                        <span className="shop-feed-rating">* {toShopRating(vendor.experience).toFixed(1)}</span>
                      </div>

                      <p className="shop-feed-meta">
                        {typeof vendorDistances[String(vendor.id)] === "number"
                          ? `${vendorDistances[String(vendor.id)].toFixed(1)} km | ${toEtaMinutes(vendorDistances[String(vendor.id)])}`
                          : toEtaMinutes()}
                        {" | "}
                        {vendor.area || "Area not provided"}
                      </p>

                      <p className="shop-feed-submeta">
                        {selectedService?.name || "Service"}
                        {typeof vendorDistances[String(vendor.id)] === "number"
                          ? ` | ${vendorDistances[String(vendor.id)].toFixed(1)} km away`
                          : ""}
                      </p>

                      <p className="shop-feed-offer">
                        {typeof vendor.experience === "number"
                          ? `${vendor.experience}+ yrs experience`
                          : "Experienced professional team"}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </div>

      {isFilterSheetOpen ? (
        <div className="shop-filter-sheet-overlay" onClick={() => setIsFilterSheetOpen(false)}>
          <section
            className="shop-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Filter shops"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shop-filter-sheet-handle" aria-hidden="true" />
            <div className="shop-filter-sheet-head">
              <h2>Filters</h2>
              <button type="button" onClick={() => setIsFilterSheetOpen(false)} aria-label="Close filters">
                Close
              </button>
            </div>

            <div className="shop-filter-sheet-section">
              <p>Sort by</p>
              <div className="shop-filter-sheet-chip-row">
                {[
                  { key: "all", label: "Default" },
                  { key: "near", label: "Near & Fast" },
                  { key: "top", label: "Top Rated" },
                  { key: "offers", label: "Best Deals" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`shop-filter-sheet-chip ${draftQuickFilter === item.key ? "active" : ""}`}
                    onClick={() => setDraftQuickFilter(item.key as QuickFilter)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="shop-filter-sheet-section">
              <p>Distance</p>
              <label className="shop-filter-sheet-toggle">
                <input
                  type="checkbox"
                  checked={draftNearbyOnly}
                  onChange={(event) => setDraftNearbyOnly(event.target.checked)}
                  disabled={!userLocation}
                />
                Nearby only
              </label>

              <div className="shop-filter-sheet-chip-row">
                {radiusOptions.map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    className={`shop-filter-sheet-chip ${draftRadiusKm === radius ? "active" : ""}`}
                    onClick={() => setDraftRadiusKm(radius)}
                    disabled={!userLocation}
                  >
                    {radius} km
                  </button>
                ))}
              </div>
            </div>

            <div className="shop-filter-sheet-actions">
              <button type="button" className="shop-filter-sheet-reset" onClick={resetSheetFilters}>
                Reset
              </button>
              <button type="button" className="shop-filter-sheet-apply" onClick={applySheetFilters}>
                Apply filters
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default function ShopsPage() {
  return (
    <Suspense
      fallback={
        <main className="landing" style={{ minHeight: "100vh", padding: "6rem 1rem 2rem" }}>
          <div className="container" style={{ maxWidth: "980px" }}>
            <p style={{ margin: 0, color: "var(--gray-500)" }}>Loading shops...</p>
          </div>
        </main>
      }
    >
      <ShopsPageContent />
    </Suspense>
  );
}
