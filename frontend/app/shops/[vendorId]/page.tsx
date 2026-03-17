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
};

export default function ShopDetailPage() {
  const router = useRouter();
  const params = useParams<{ vendorId: string }>();
  const searchParams = useSearchParams();

  const [service, setService] = useState<Service | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<ShopCart | null>(null);

  const vendorId = params.vendorId;
  const serviceId = searchParams.get("serviceId") || "";

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [servicesResponse, vendorsResponse] = await Promise.all([
          fetch(apiUrl("/services"), { cache: "no-store" }),
          fetch(apiUrl("/vendors"), { cache: "no-store" }),
        ]);

        const [servicesData, vendorsData] = await Promise.all([
          servicesResponse.json(),
          vendorsResponse.json(),
        ]);

        const matchedService = Array.isArray(servicesData)
          ? servicesData.find((item: Service) => String(item.id) === String(serviceId))
          : null;
        const matchedVendor = Array.isArray(vendorsData)
          ? vendorsData.find((item: Vendor) => String(item.id) === String(vendorId))
          : null;

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
    }));

    const addonItems = blueprint.addons.map((item) => ({
      id: `addon-${item.id}`,
      name: item.name,
      description: item.description,
      price: item.price,
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

  const cartCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const cartTotal = getCartTotal(cart);

  if (loading) {
    return (
      <main className="landing" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p style={{ color: "var(--gray-500)" }}>Loading shop menu...</p>
      </main>
    );
  }

  if (!service || !vendor) {
    return (
      <main className="landing" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "var(--gray-500)" }}>Shop not found.</p>
          <button className="btn-book" type="button" onClick={() => router.push("/")}>Back Home</button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="landing"
      style={{
        minHeight: "100vh",
        padding: "6rem 1rem 7rem",
        background:
          "radial-gradient(circle at 80% 8%, rgba(122,106,0,0.12), transparent 35%), radial-gradient(circle at 16% 14%, rgba(30,144,255,0.1), transparent 35%), var(--off-white)",
      }}
    >
      <div className="container" style={{ maxWidth: "920px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, color: "var(--gray-800)", fontFamily: "var(--font-display)" }}>{vendor.name || "Shop"}</h1>
            <p style={{ marginTop: "0.35rem", marginBottom: 0, color: "var(--gray-500)" }}>
              {vendor.area || "Area not available"} • {service.name}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/checkout")}
            style={{
              borderRadius: "999px",
              border: "1px solid rgba(122,106,0,0.25)",
              background: "var(--white)",
              color: "var(--gold)",
              fontWeight: 700,
              padding: "0.62rem 1rem",
              cursor: "pointer",
            }}
          >
            Cart ({cartCount})
          </button>
        </div>

        <section style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
          {menuItems.map((item) => (
            <article
              key={item.id}
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
                <h3 style={{ margin: 0, color: "var(--gray-800)" }}>{item.name}</h3>
                <p style={{ margin: "0.3rem 0", color: "var(--gray-500)", fontSize: "0.9rem" }}>{item.description}</p>
                <strong style={{ color: "var(--gray-800)" }}>{formatPrice(item.price)}</strong>
              </div>
              <button className="btn-book" type="button" onClick={() => addToCart(item)}>
                Add
              </button>
            </article>
          ))}
        </section>
      </div>

      {cartCount > 0 && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "1rem",
            width: "min(760px, calc(100% - 1.5rem))",
            background: "var(--white)",
            border: "1px solid var(--gray-200)",
            borderRadius: "14px",
            boxShadow: "var(--shadow-lg)",
            padding: "0.75rem 0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.7rem",
            zIndex: 1000,
          }}
        >
          <div>
            <div style={{ color: "var(--gray-800)", fontWeight: 700 }}>{cartCount} items in cart</div>
            <div style={{ color: "var(--gray-500)", fontSize: "0.86rem" }}>Total: {formatPrice(cartTotal)}</div>
          </div>

          <button className="btn-book" type="button" onClick={() => router.push("/checkout")}>
            Go to Payment
          </button>
        </div>
      )}
    </main>
  );
}
