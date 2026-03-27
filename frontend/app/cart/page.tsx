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

  const handleClear = () => {
    clearShopCart();
    setCart(null);
  };

  if (!cart || cart.items.length === 0) {
    return (
      <main className="landing cart-shell">
        <section className="cart-empty-card">
          <h1>Your service cart is empty</h1>
          <p>Add services from shops to continue with booking.</p>
          <button type="button" onClick={() => router.push("/")}>Browse services</button>
        </section>
      </main>
    );
  }

  return (
    <main className="landing cart-shell">
      <div className="cart-page-wrap">
        <section className="cart-hero">
          <h1>YOUR SERVICES CART</h1>
          <p>{itemCount} service{itemCount === 1 ? "" : "s"} added</p>
          <button type="button" onClick={handleClear}>Clear Cart</button>
        </section>

        <section className="cart-items-list">
          {cart.items.map((item) => (
            <article key={item.id} className="cart-item-card">
              <div className="cart-item-head">
                <h2>{item.name}</h2>
                <span>{formatPrice(item.price)}</span>
              </div>
              <p className="cart-item-meta">{cart.serviceName} - Qty {item.quantity}</p>
              <div className="cart-item-total">Item total: {formatPrice(item.price * item.quantity)}</div>
            </article>
          ))}
        </section>

        <section className="cart-summary-card">
          <h3>Order Summary</h3>
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
          <div className="cart-cta-row">
            <button type="button" className="cart-secondary-btn" onClick={() => router.push("/shops")}>Continue exploring</button>
            <button type="button" className="cart-primary-btn" onClick={() => router.push("/checkout?step=review")}>Checkout</button>
          </div>
        </section>
      </div>
    </main>
  );
}
