"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearShopCart, readShopCart, type ShopCart } from "@/lib/shop-cart";
import { formatPrice } from "@/lib/booking-flow";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<ShopCart | null>(null);
  const [lastCartContext, setLastCartContext] = useState<{
    vendorId: string;
    vendorName: string;
    serviceId: string;
  } | null>(null);

  useEffect(() => {
    const syncCart = () => {
      setCart(readShopCart());
    };

    syncCart();

    const onCartUpdated = () => syncCart();
    window.addEventListener("servicego-cart-updated", onCartUpdated as EventListener);
    window.addEventListener("focus", syncCart);

    return () => {
      window.removeEventListener("servicego-cart-updated", onCartUpdated as EventListener);
      window.removeEventListener("focus", syncCart);
    };
  }, []);

  const total = useMemo(() => {
    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const uniqueItemCount = cart?.items.length ?? 0;

  const handleClear = () => {
    if (cart) {
      setLastCartContext({
        vendorId: cart.vendorId,
        vendorName: cart.vendorName,
        serviceId: cart.serviceId,
      });
    }

    clearShopCart();
    setCart(null);
  };

  const getVendorServicePath = (vendorId: string, serviceId: string) => {
    return `/shops/${encodeURIComponent(vendorId)}?serviceId=${encodeURIComponent(serviceId)}`;
  };

  const vendorServicePath = cart?.vendorId && cart?.serviceId
    ? getVendorServicePath(cart.vendorId, cart.serviceId)
    : lastCartContext?.vendorId && lastCartContext?.serviceId
      ? getVendorServicePath(lastCartContext.vendorId, lastCartContext.serviceId)
      : "/shops";

  if (!cart || cart.items.length === 0) {
    return (
      <main className="landing checkout-mobile-shell">
        <div className="checkout-mobile-wrap">
          <section className="checkout-empty-state">
            <h1>Your service cart is empty</h1>
            <p>
              {lastCartContext
                ? `Continue with ${lastCartContext.vendorName} to add more subservices.`
                : "Add subservices from a vendor to continue with checkout."}
            </p>
            <button type="button" className="checkout-primary-cta" onClick={() => router.push(vendorServicePath)}>
              {lastCartContext ? `Back to ${lastCartContext.vendorName}` : "Select service"}
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="landing checkout-mobile-shell">
      <div className="checkout-mobile-wrap">
        <section className="checkout-block" style={{ marginTop: "0.8rem" }}>
          <h2 style={{ margin: 0, color: "var(--gray-900)", fontSize: "1.05rem" }}>Your Cart</h2>
          <p style={{ margin: "0.25rem 0 0", color: "var(--gray-600)", fontSize: "0.85rem" }}>
            {itemCount} service{itemCount === 1 ? "" : "s"} selected from {cart.vendorName}
          </p>
        </section>

        <section className="checkout-saved-banner">
          {uniqueItemCount} item{uniqueItemCount === 1 ? "" : "s"} • Subtotal {formatPrice(total)}
        </section>

        <div className="checkout-layout-grid">
          <section className="checkout-main-column">
            <section className="checkout-block checkout-items-card">
              <div className="checkout-section-head">
                <h3>{cart.serviceName}</h3>
                <button type="button" className="checkout-add-more" onClick={() => router.push(vendorServicePath)}>
                  Add more
                </button>
              </div>

              {cart.items.map((item) => (
                <div key={item.id} className="checkout-item-row">
                  <div>
                    <strong>{item.name}</strong>
                    <p>Line total {formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <span className="checkout-security-pill">Qty {item.quantity}</span>
                </div>
              ))}
            </section>
          </section>

          <aside className="checkout-side-column">
            <section className="checkout-block checkout-bill-card">
              <div className="checkout-bill-row">
                <span>Order value</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p>Taxes and final charges are shown at checkout.</p>
            </section>

            <section className="checkout-policy-text">
              <h4>CART ACTIONS</h4>
              <p>
                One cart supports subservices from one vendor at a time.
              </p>
              <button type="button" className="checkout-add-more" onClick={handleClear}>Clear cart</button>
            </section>
          </aside>
        </div>
      </div>

      <footer className="checkout-sticky-bar">
        <div className="checkout-pay-bar">
          <div>
            <span>PAYABLE</span>
            <strong>{formatPrice(total)}</strong>
          </div>
          <button type="button" onClick={() => router.push("/checkout?step=review")}>Checkout</button>
        </div>
      </footer>
    </main>
  );
}
