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

  const serviceId = searchParams.get("serviceId") || "";

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "0.86rem", fontWeight: 700 }}>
              Browse shops
            </p>
            <h1 style={{ marginTop: "0.35rem", marginBottom: "0.25rem", fontFamily: "var(--font-display)", color: "var(--gray-800)" }}>
              {selectedService ? `${selectedService.name} shops` : "Service shops"}
            </h1>
            <p style={{ margin: 0, color: "var(--gray-500)" }}>
              Browse all active shops, or filter nearby using your saved location.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => router.push("/checkout")}
              style={{
                border: "1px solid rgba(122, 106, 0, 0.24)",
                background: "var(--white)",
                color: "var(--gold)",
                borderRadius: "999px",
                padding: "0.58rem 1rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cart ({cartCount})
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                border: "1px solid var(--gray-300)",
                background: "var(--white)",
                color: "var(--gray-700)",
                borderRadius: "999px",
                padding: "0.58rem 1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
          </div>
        </div>

        <section
          style={{
            marginTop: "1rem",
            background: "var(--white)",
            border: "1px solid var(--gray-200)",
            borderRadius: "16px",
            padding: "1rem",
            display: "grid",
            gap: "0.8rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.7rem" }}>
            <input
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="Add full address for checkout"
              style={{
                borderRadius: "10px",
                border: "1px solid var(--gray-300)",
                padding: "0.72rem 0.85rem",
              }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
              <button
                type="button"
                onClick={detectAndSaveUserLocation}
                style={{
                  borderRadius: "999px",
                  border: "1px solid var(--gray-300)",
                  background: "var(--white)",
                  padding: "0.58rem 0.95rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isDetectingLocation ? "Detecting location..." : userLocation ? "Update my location" : "Use my location"}
              </button>

              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--gray-600)", fontSize: "0.9rem" }}>
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
                onChange={(event) => setRadiusKm(Number(event.target.value))}
                disabled={!userLocation || !nearbyOnly}
                style={{
                  borderRadius: "10px",
                  border: "1px solid var(--gray-300)",
                  padding: "0.52rem 0.72rem",
                  background: "var(--white)",
                  color: "var(--gray-700)",
                }}
              >
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={15}>Within 15 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
              </select>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--gray-500)" }}>
            {userLocation
              ? `Current location: ${userLocation.area || userLocation.city || "Detected"}${userLocation.postcode ? ` - ${userLocation.postcode}` : ""}`
              : "Allow location once to enable nearby filtering. Saved for future visits."}
          </p>

          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--gray-500)" }}>
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
            {filteredVendors.length === 0 ? (
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
              filteredVendors.map((vendor) => (
                <article
                  className="shop-list-card"
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
                  style={{
                    background: "var(--white)",
                    border: "1px solid var(--gray-200)",
                    borderRadius: "14px",
                    padding: "1rem",
                    display: "grid",
                    gap: "0.8rem",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, color: "var(--gray-800)" }}>{vendor.name || "Shop"}</h3>
                    <p style={{ margin: "0.28rem 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>
                      {vendor.area || "Area not provided"}
                    </p>
                    {typeof vendorDistances[String(vendor.id)] === "number" ? (
                      <p style={{ margin: "0 0 0.28rem", color: "var(--gray-500)", fontSize: "0.85rem" }}>
                        {vendorDistances[String(vendor.id)].toFixed(1)} km away
                      </p>
                    ) : null}
                    <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "0.84rem" }}>
                      {typeof vendor.experience === "number" ? `${vendor.experience}+ years experience` : "Experienced professional team"}
                    </p>
                  </div>
                </article>
              ))
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
