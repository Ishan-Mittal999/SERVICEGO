"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { formatPrice, getServiceBlueprint, mergeBookingDraft, readBookingDraft } from "@/lib/booking-flow";
import {
  addCartItem,
  clearShopCart,
  getCartTotal,
  initializeShopCart,
  readShopCart,
  updateCartItemQuantity,
  type ShopCart,
} from "@/lib/shop-cart";

type Service = {
  id: string | number;
  name: string;
  description?: string;
};

type Vendor = {
  id: string | number;
  name?: string;
  area?: string;
  phone?: string;
  service_id?: string | number;
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  kind: "package" | "addon";
};

const getDemandScore = (value: string) => {
  let score = 0;
  for (let index = 0; index < value.length; index += 1) {
    score += value.charCodeAt(index);
  }
  return score % 100;
};

const getItemVisual = (itemId: string) => {
  const palette = [
    "linear-gradient(135deg, #f43f5e 0%, #ef4444 40%, #dc2626 100%)",
    "linear-gradient(135deg, #1d4ed8 0%, #06b6d4 48%, #0e7490 100%)",
    "linear-gradient(135deg, #16a34a 0%, #22c55e 45%, #15803d 100%)",
    "linear-gradient(135deg, #f97316 0%, #f59e0b 42%, #d97706 100%)",
  ];

  return palette[getDemandScore(itemId) % palette.length];
};

export default function ShopDetailPage() {
  const router = useRouter();
  const params = useParams<{ vendorId: string }>();
  const searchParams = useSearchParams();

  const [service, setService] = useState<Service | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<ShopCart | null>(null);
  const [menuQuery, setMenuQuery] = useState("");
  const [recommendedOnly, setRecommendedOnly] = useState(false);
  const [highDemandOnly, setHighDemandOnly] = useState(false);

  const vendorId = params.vendorId;
  const serviceId = searchParams.get("serviceId") || "";

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch specific service and vendor by ID instead of all records
        const [serviceResponse, vendorResponse] = await Promise.all([
          fetch(apiUrl(`/services/${serviceId}`), { cache: "no-store" }),
          fetch(apiUrl(`/vendors/${vendorId}`), { cache: "no-store" }),
        ]);

        let matchedService = null;
        let matchedVendor = null;

        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json();
          matchedService = serviceData.data || serviceData;
        }

        if (vendorResponse.ok) {
          const vendorData = await vendorResponse.json();
          matchedVendor = vendorData.data || vendorData;
        }

        setService(matchedService ?? null);
        setVendor(matchedVendor ?? null);

        if (matchedService && matchedVendor) {
          const draft = readBookingDraft();
          const nextCart = initializeShopCart({
            vendorId: String(matchedVendor.id),
            vendorName: matchedVendor.name || "Vendor shop",
            serviceId: String(matchedService.id),
            serviceName: matchedService.name,
            city: draft?.locationLabel || "",
            addressLine: draft?.addressLine || "",
            items: [],
          });

          setCart(nextCart);
        }
      } catch (error) {
        console.error("Failed to load shop detail", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [serviceId, vendorId]);

  const menuItems = useMemo(() => {
    if (!service) {
      return [] as MenuItem[];
    }

    const blueprint = getServiceBlueprint(service.name);

    const packageItems = blueprint.packages.map((item) => ({
      id: `pkg-${item.id}`,
      name: item.name,
      description: item.description,
      price: item.price,
      kind: "package" as const,
    }));

    const addonItems = blueprint.addons.map((item) => ({
      id: `addon-${item.id}`,
      name: item.name,
      description: item.description,
      price: item.price,
      kind: "addon" as const,
    }));

    return [...packageItems, ...addonItems];
  }, [service]);

  const refreshCart = () => {
    setCart(readShopCart());
  };

  const addToCart = (item: MenuItem) => {
    if (!service || !vendor) {
      return;
    }

    const existing = readShopCart();
    if (existing && existing.vendorId !== String(vendor.id)) {
      clearShopCart();
      initializeShopCart({
        vendorId: String(vendor.id),
        vendorName: vendor.name || "Vendor shop",
        serviceId: String(service.id),
        serviceName: service.name,
        city: existing.city,
        addressLine: existing.addressLine,
        items: [],
      });
    }

    addCartItem({
      id: item.id,
      name: item.name,
      price: item.price,
    });

    mergeBookingDraft({
      serviceId: String(service.id),
      serviceName: service.name,
      serviceDescription: service.description,
    });

    refreshCart();
  };

  const goBackToVendorSelection = () => {
    const query = serviceId ? `?serviceId=${encodeURIComponent(String(serviceId))}` : "";
    router.push(`/shops${query}`);
  };

  const itemQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};
    cart?.items.forEach((entry) => {
      quantities[entry.id] = entry.quantity;
    });
    return quantities;
  }, [cart]);

  const decreaseItemQuantity = (itemId: string) => {
    const existingQuantity = itemQuantities[itemId] ?? 0;
    if (existingQuantity <= 0) {
      return;
    }

    updateCartItemQuantity(itemId, existingQuantity - 1);
    refreshCart();
  };

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartTotal = getCartTotal(cart);

  const visibleMenuItems = useMemo(() => {
    const normalizedQuery = menuQuery.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesQuery = !normalizedQuery
        || `${item.name} ${item.description}`.toLowerCase().includes(normalizedQuery);
      const matchesRecommended = !recommendedOnly || item.kind === "package";
      const matchesHighDemand = !highDemandOnly || getDemandScore(item.id) >= 55;

      return matchesQuery && matchesRecommended && matchesHighDemand;
    });
  }, [highDemandOnly, menuItems, menuQuery, recommendedOnly]);

  const packageItems = visibleMenuItems.filter((item) => item.kind === "package");
  const addonItems = visibleMenuItems.filter((item) => item.kind === "addon");

  if (loading) {
    return (
      <main className="landing" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--gray-500)" }}>Loading service options...</p>
      </main>
    );
  }

  if (!service || !vendor) {
    return (
      <main className="landing" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--gray-500)" }}>Service partner not found.</p>
          <button className="btn-book" type="button" onClick={() => router.push("/")}>Back Home</button>
        </div>
      </main>
    );
  }

  return (
    <main className="landing mobile-page-shell service-menu-shell">
      <div className="container service-menu-wrap" style={{ maxWidth: "980px" }}>
        <div className="service-menu-search-wrap" style={{ marginTop: "0.8rem" }}>
          <input
            value={menuQuery}
            onChange={(event) => setMenuQuery(event.target.value)}
            placeholder={`Search in ${service.name.toLowerCase()} plans`}
            aria-label="Search services"
          />
        </div>

        <section className="service-menu-meta">
          <h1>{vendor.name || "Service Partner"}</h1>
          <p>{vendor.area || "Area not available"} • {service.name}</p>

          <div className="service-menu-cart-row">
            <button type="button" className="service-menu-cart-btn" onClick={() => router.push("/checkout")}>Cart ({cartCount})</button>
            <span>{visibleMenuItems.length} options</span>
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

          <button type="button" className="service-filter-chip" onClick={goBackToVendorSelection}>
            Change vendor
          </button>
        </section>

        <section className="service-menu-section">
          {packageItems.length > 0 ? (
            <>
              <h2 className="service-menu-section-title">Best Service Plans</h2>
              {packageItems.map((item) => {
                const itemQuantity = itemQuantities[item.id] ?? 0;

                return (
                  <article
                    className="service-item-card"
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => addToCart(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        addToCart(item);
                      }
                    }}
                  >
                    <div className="service-item-content">
                      <span className="service-item-badge">Verified</span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div className="service-item-price">{formatPrice(item.price)}</div>
                      <div className="service-item-note">Ideal for quick and reliable fixes.</div>
                    </div>

                    <div className="service-item-visual-wrap">
                      <div className="service-item-visual" style={{ background: getItemVisual(item.id) }}>
                        <span>Service plan</span>
                      </div>

                      {itemQuantity > 0 ? (
                        <div className="service-item-stepper" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => decreaseItemQuantity(item.id)}
                            aria-label={`Decrease ${item.name}`}
                          >
                            −
                          </button>
                          <span>{itemQuantity}</span>
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            aria-label={`Increase ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="service-item-add-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(item);
                          }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </>
          ) : null}

          {addonItems.length > 0 ? (
            <>
              <h2 className="service-menu-section-title">Extra Add-ons</h2>
              {addonItems.map((item) => {
                const itemQuantity = itemQuantities[item.id] ?? 0;

                return (
                  <article
                    className="service-item-card"
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => addToCart(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        addToCart(item);
                      }
                    }}
                  >
                    <div className="service-item-content">
                      <span className="service-item-badge">Optional</span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div className="service-item-price">{formatPrice(item.price)}</div>
                      <div className="service-item-note">Add only if you need this support.</div>
                    </div>

                    <div className="service-item-visual-wrap">
                      <div className="service-item-visual" style={{ background: getItemVisual(item.id) }}>
                        <span>Add-on support</span>
                      </div>

                      {itemQuantity > 0 ? (
                        <div className="service-item-stepper" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => decreaseItemQuantity(item.id)}
                            aria-label={`Decrease ${item.name}`}
                          >
                            −
                          </button>
                          <span>{itemQuantity}</span>
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            aria-label={`Increase ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="service-item-add-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(item);
                          }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </>
          ) : null}

          {visibleMenuItems.length === 0 ? (
            <div className="service-menu-empty">
              No results found for this search/filter. Try removing a filter.
            </div>
          ) : null}
        </section>
      </div>

      {cartCount > 0 ? (
        <div className="service-menu-cart-sticky">
          <div>
            <div className="service-menu-cart-count">{cartCount} items selected</div>
            <div className="service-menu-cart-total">Total: {formatPrice(cartTotal)}</div>
          </div>

          <button className="service-menu-cart-cta" type="button" onClick={() => router.push("/checkout")}>
            Proceed to Checkout
          </button>
        </div>
      ) : null}
    </main>
  );
}
