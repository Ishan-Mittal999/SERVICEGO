"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearShopCart, readShopCart, type ShopCart } from "@/lib/shop-cart";
import { formatPrice } from "@/lib/booking-flow";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<ShopCart | null>(null);

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
    clearShopCart();
    setCart(null);
  };

  if (!cart || cart.items.length === 0) {
    return (
      <main className="landing cart-shell">
        <section className="cart-empty-card">
          <div className="cart-empty-icon" aria-hidden="true">🛒</div>
          <span className="cart-eyebrow">Ready when you are</span>
          <h1>Your service cart is empty</h1>
          <p>Add a plan from a shop to build your booking and checkout in one flow.</p>
          <div className="cart-empty-actions">
            <button type="button" onClick={() => router.push("/")}>Browse services</button>
            <button type="button" className="cart-empty-secondary" onClick={() => router.push("/shops")}>Find shops</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="landing cart-shell">
      <div className="cart-page-wrap">
        <section className="cart-hero">
          <div className="cart-hero-copy">
            <span className="cart-eyebrow">ServiceGo cart</span>
            <h1>Your booking, ready to confirm</h1>
            <p>{itemCount} service{itemCount === 1 ? "" : "s"} selected from {cart.vendorName}.</p>
          </div>

          <div className="cart-hero-stats">
            <div>
              <span>Items</span>
              <strong>{uniqueItemCount}</strong>
            </div>
            <div>
              <span>Total quantity</span>
              <strong>{itemCount}</strong>
            </div>
            <div>
              <span>Subtotal</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          </div>

          <div className="cart-hero-actions">
            <button type="button" onClick={() => router.push("/shops")}>Add more</button>
            <button type="button" className="cart-hero-clear" onClick={handleClear}>Clear cart</button>
          </div>
        </section>

        <div className="cart-content-grid">
          <section className="cart-items-list">
            <div className="cart-section-heading">
              <div>
                <span className="cart-eyebrow">Selected plan</span>
                <h2>{cart.serviceName}</h2>
              </div>
              <span className="cart-vendor-pill">{cart.vendorName}</span>
            </div>

            {cart.items.map((item) => (
              <article key={item.id} className="cart-item-card">
                <div className="cart-item-head">
                  <div>
                    <span className="cart-item-kicker">Chosen service</span>
                    <h3>{item.name}</h3>
                  </div>
                  <span className="cart-item-price">{formatPrice(item.price)}</span>
                </div>

                <div className="cart-item-meta-row">
                  <span className="cart-item-meta">Qty {item.quantity}</span>
                  <span className="cart-item-dot" aria-hidden="true">•</span>
                  <span className="cart-item-meta">Line total {formatPrice(item.price * item.quantity)}</span>
                </div>
              </article>
            ))}
          </section>

          <section className="cart-summary-card">
            <span className="cart-eyebrow">Order summary</span>
            <h3>Review before checkout</h3>

            <div className="cart-summary-panel">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Taxes</span>
                <strong>{formatPrice(0)}</strong>
              </div>
              <div className="cart-summary-row total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </div>

            <div className="cart-summary-note">
              <span aria-hidden="true">✓</span>
              <p>We keep your selected shop and items together until you place the booking.</p>
            </div>

            <div className="cart-cta-row">
              <button type="button" className="cart-secondary-btn" onClick={() => router.push("/shops")}>Continue exploring</button>
              <button type="button" className="cart-primary-btn" onClick={() => router.push("/checkout?step=review")}>Checkout</button>
            </div>
          </section>
        </div>

        <section className="cart-footnote">
          <span className="cart-footnote-badge">Booking ready</span>
          <p>
            Cart updates are synced live across the app, so adding or removing services updates this page, the header badge,
            and checkout immediately.
          </p>
        </section>
      </div>
    </main>
  );
}
