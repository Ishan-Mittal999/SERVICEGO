"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";
import { readSelectedCity, writeSelectedCity } from "@/lib/address-book";
import { readShopCart } from "@/lib/shop-cart";

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
  experience?: number;
  is_active?: boolean;
};

export default function ShopsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const serviceId = searchParams.get("serviceId") || "";

  useEffect(() => {
    setSelectedCity(readSelectedCity());
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

  const cityOptions = useMemo(() => {
    const unique = new Set<string>();
    vendors.forEach((vendor) => {
      if (vendor.area?.trim()) {
        unique.add(vendor.area.trim());
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const serviceFiltered = vendors.filter((vendor) => String(vendor.service_id) === String(serviceId));
    const activeFiltered = serviceFiltered.filter((vendor) => vendor.is_active !== false);

    if (!selectedCity.trim()) {
      return activeFiltered;
    }

    return activeFiltered.filter((vendor) =>
      (vendor.area || "").toLowerCase().includes(selectedCity.trim().toLowerCase())
    );
  }, [vendors, selectedCity, serviceId]);

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Location is not supported. Select city manually.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const locationTag = `Near (${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)})`;
        setSelectedCity(locationTag);
      },
      () => {
        setIsLocating(false);
        setErrorMessage("Could not detect location. Choose city manually.");
      }
    );
  };

  useEffect(() => {
    if (!selectedCity.trim()) {
      requestCurrentLocation();
    }
    // Trigger once on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openShop = (vendor: Vendor) => {
    if (!selectedService) {
      return;
    }

    writeSelectedCity(selectedCity);
    mergeBookingDraft({
      serviceId: String(selectedService.id),
      serviceName: selectedService.name,
      serviceDescription: selectedService.description,
      locationLabel: selectedCity.trim(),
      addressLine: addressLine.trim(),
    });

    router.push(`/shops/${encodeURIComponent(String(vendor.id))}?serviceId=${encodeURIComponent(String(selectedService.id))}`);
  };

  return (
    <main
      className="landing"
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
              {selectedService ? `${selectedService.name} shops near you` : "Service shops"}
            </h1>
            <p style={{ margin: 0, color: "var(--gray-500)" }}>
              Select city and address to view relevant nearby vendors.
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.7rem" }}>
            <input
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              placeholder="Choose city (e.g. Delhi, Gurgaon)"
              list="city-options"
              style={{
                borderRadius: "10px",
                border: "1px solid var(--gray-300)",
                padding: "0.72rem 0.85rem",
              }}
            />
            <datalist id="city-options">
              {cityOptions.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>

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

            <button
              type="button"
              onClick={requestCurrentLocation}
              style={{
                borderRadius: "10px",
                border: "1px solid var(--gray-300)",
                background: "var(--white)",
                padding: "0.72rem 0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isLocating ? "Detecting..." : "Use Location"}
            </button>
          </div>

          <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--gray-500)" }}>
            City is used for nearby shop filtering. You can refine address now and still edit it at checkout.
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
                No shops found for this service in selected city. Try another city.
              </div>
            ) : (
              filteredVendors.map((vendor) => (
                <article
                  key={String(vendor.id)}
                  style={{
                    background: "var(--white)",
                    border: "1px solid var(--gray-200)",
                    borderRadius: "14px",
                    padding: "1rem",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "0.8rem",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, color: "var(--gray-800)" }}>{vendor.name || "Shop"}</h3>
                    <p style={{ margin: "0.28rem 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>
                      {vendor.area || "Area not provided"}
                    </p>
                    <p style={{ margin: 0, color: "var(--gray-500)", fontSize: "0.84rem" }}>
                      {typeof vendor.experience === "number" ? `${vendor.experience}+ years experience` : "Experienced professional team"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-book"
                    onClick={() => openShop(vendor)}
                  >
                    Open Shop
                  </button>
                </article>
              ))
            )}
          </section>
        )}
      </div>
    </main>
  );
}
