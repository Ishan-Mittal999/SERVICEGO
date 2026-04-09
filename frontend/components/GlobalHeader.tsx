"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { readShopCart } from "@/lib/shop-cart";
import { readUserLocation } from "@/lib/location";

export default function GlobalHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [logoSrc, setLogoSrc] = useState("/icon.webp");
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [locationLabel, setLocationLabel] = useState("Select location");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const syncCartCount = () => {
      const cart = readShopCart();
      const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
      setCartCount(count);

      const storedLocation = readUserLocation();
      const nextLabel = storedLocation?.area || storedLocation?.city || "Select location";
      setLocationLabel(nextLabel);
    };

    syncCartCount();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "servicego-shop-cart") {
        syncCartCount();
      }
    };

    const onCartUpdated = () => {
      syncCartCount();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("servicego-cart-updated", onCartUpdated as EventListener);
    window.addEventListener("focus", syncCartCount);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("servicego-cart-updated", onCartUpdated as EventListener);
      window.removeEventListener("focus", syncCartCount);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const openSection = (sectionId: string) => {
    if (pathname === "/") {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    router.push(`/#${sectionId}`);
  };

  return (
    <header className="global-app-header">
      <div className="global-app-header-inner">
        <Link href="/" className="global-brand" aria-label="ServiceGo home">
          <Image
            src={logoSrc}
            alt="ServiceGo"
            className="global-brand-logo"
            width={40}
            height={40}
            priority
            unoptimized
            onError={() => {
              if (logoSrc !== "/newwlogo.webp") {
                setLogoSrc("/newwlogo.webp");
              }
            }}
          />
          <strong>ServiceGo</strong>
        </Link>

        <nav className="global-nav" aria-label="Primary navigation">
          <button type="button" onClick={() => openSection("services")}>Services</button>
          <button type="button" onClick={() => openSection("how")}>How It Works</button>
          <button type="button" onClick={() => router.push("/profile")}>Profile</button>
          <button type="button" onClick={() => router.push("/bookings")}>My Bookings</button>
        </nav>

        <div className="global-header-actions">
          {cartCount > 0 ? (
            <button
              type="button"
              className="global-cart-icon-btn"
              onClick={() => router.push("/cart")}
              aria-label="Open cart"
            >
              <span aria-hidden="true">🛒</span>
              <span className="global-cart-badge">{cartCount}</span>
            </button>
          ) : null}

          <button
            type="button"
            className="global-menu-btn"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            {mobileMenuOpen ? "×" : "☰"}
          </button>
        </div>
      </div>

      {isMounted && mobileMenuOpen
        ? createPortal(
            <div className="global-mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
              <aside className="global-mobile-menu" onClick={(event) => event.stopPropagation()}>
                <div className="global-mobile-menu-head">
                  <div className="global-mobile-brand-row">
                    <Image src="/icon.webp" alt="ServiceGo" width={28} height={28} unoptimized />
                    <strong>ServiceGo</strong>
                  </div>
                  <button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">×</button>
                </div>

                <div className="global-mobile-menu-card">
                  <span className="global-mobile-menu-label">Location</span>
                  <strong>{locationLabel}</strong>
                </div>

                <nav className="global-mobile-menu-links" aria-label="Mobile menu">
                  <button type="button" onClick={() => openSection("services")}>Services</button>
                  <button type="button" onClick={() => openSection("how")}>How It Works</button>
                  <button type="button" onClick={() => router.push("/profile")}>Profile</button>
                  <button type="button" onClick={() => router.push("/bookings")}>My Bookings</button>
                  <button type="button" onClick={() => router.push("/faqs")}>FAQs</button>
                  <button type="button" onClick={() => router.push("/privacy")}>Privacy Policy</button>
                  {cartCount > 0 ? (
                    <button type="button" onClick={() => router.push("/cart")}>Cart ({cartCount})</button>
                  ) : null}
                </nav>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </header>
  );
}
