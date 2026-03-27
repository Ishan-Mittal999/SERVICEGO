"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { formatPrice } from "@/lib/booking-flow";
import {
  getCartTotal,
  readShopCart,
  updateCartItemQuantity,
  writeShopCart,
  type ShopCart,
} from "@/lib/shop-cart";
import {
  getDefaultAddress,
  readAddressBook,
  saveAddress,
  setDefaultAddress,
  type SavedAddress,
} from "@/lib/address-book";
import {
  detectUserLocation,
  geocodeArea,
  readUserLocation,
  reverseGeocode,
} from "@/lib/location";
import {
  createOrder,
  verifyPayment,
  type PaymentGatewayMethod,
} from "../../lib/payment-gateway";

type CheckoutStep = "review" | "payment";
type PaymentMethod = PaymentGatewayMethod;

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  label: string;
  subtitle: string;
  available: boolean;
  tag?: string;
}> = [
  {
    id: "upi",
    label: "UPI / Wallet",
    subtitle: "Google Pay, PhonePe, Paytm",
    available: false,
    tag: "Coming soon",
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    subtitle: "Visa, Mastercard, RuPay",
    available: false,
    tag: "Coming soon",
  },
  {
    id: "netbanking",
    label: "Net Banking",
    subtitle: "All major Indian banks",
    available: false,
    tag: "Coming soon",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    subtitle: "Pay after service completion",
    available: true,
    tag: "Available",
  },
];

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<ShopCart | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [step, setStep] = useState<CheckoutStep>("review");
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [addressEditorOpen, setAddressEditorOpen] = useState(false);
  const [searchAddressText, setSearchAddressText] = useState("");
  const [addressLabel, setAddressLabel] = useState("Home");
  const [manualCity, setManualCity] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [isResolvingPin, setIsResolvingPin] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.209 });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const reverseGeocodeTimerRef = useRef<number | null>(null);
  const reverseGeocodeRequestRef = useRef(0);
  const mapPrimedRef = useRef(false);

  useEffect(() => {
    const currentCart = readShopCart();
    setCart(currentCart);

    const currentAddresses = readAddressBook();
    setAddresses(currentAddresses);

    const defaultAddress = getDefaultAddress();
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
      setManualCity(defaultAddress.city);
      setManualAddress(defaultAddress.addressLine);
      setManualPhone(defaultAddress.phone || "");
      setReceiverName(defaultAddress.label || "");
    } else if (currentCart) {
      setManualCity(currentCart.city || "");
      setManualAddress(currentCart.addressLine || "");
      setAddressEditorOpen(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stepParam = new URLSearchParams(window.location.search).get("step");
    if (stepParam === "payment") {
      setStep("payment");
    }
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login?next=%2Fcheckout");
        return;
      }

      setCustomerName(user.email?.split("@")[0] || "");
      const metadataPhone = String((user.user_metadata as { phone?: string } | null)?.phone || "");
      if (metadataPhone) {
        setProfilePhone(metadataPhone);
        setManualPhone((current) => current || metadataPhone);
      }
    };

    loadUser();
  }, [router]);

  useEffect(() => {
    if (!addressSheetOpen && !addressEditorOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAddressSheetOpen(false);
        setAddressEditorOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [addressSheetOpen, addressEditorOpen]);

  useEffect(() => {
    return () => {
      if (reverseGeocodeTimerRef.current) {
        window.clearTimeout(reverseGeocodeTimerRef.current);
      }
    };
  }, []);

  const syncAddressFromCoords = async (lat: number, lng: number) => {
    setMapCoords({ lat, lng });
    setIsResolvingPin(true);
    const requestId = reverseGeocodeRequestRef.current + 1;
    reverseGeocodeRequestRef.current = requestId;

    try {
      const reverse = await reverseGeocode(lat, lng);

      if (reverseGeocodeRequestRef.current !== requestId) {
        return;
      }

      const city = reverse.address?.city || reverse.address?.town || reverse.address?.village || "";
      const display = reverse.display_name || "";

      if (city) {
        setManualCity(city);
      }
      if (display) {
        setManualAddress(display);
        setSearchAddressText(display);
      }
      setErrorMessage(null);
    } catch (error) {
      if (reverseGeocodeRequestRef.current !== requestId) {
        return;
      }

      console.error("Failed to resolve address from map pin", error);
      setErrorMessage("Could not fetch address for selected pin. You can still type it manually.");
    } finally {
      if (reverseGeocodeRequestRef.current === requestId) {
        setIsResolvingPin(false);
      }
    }
  };

  const moveMapPin = async (lat: number, lng: number, shouldSync = true) => {
    setMapCoords({ lat, lng });

    if (leafletMapRef.current) {
      leafletMapRef.current.setView([lat, lng], Math.max(leafletMapRef.current.getZoom(), 16));
    }

    if (shouldSync) {
      await syncAddressFromCoords(lat, lng);
    }
  };

  useEffect(() => {
    if (!addressEditorOpen) {
      mapPrimedRef.current = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      return;
    }

    if (mapPrimedRef.current) {
      return;
    }

    mapPrimedRef.current = true;

    const primeMapCoords = async () => {
      if (manualAddress.trim()) {
        const resolved = await geocodeArea(manualAddress.trim());
        if (resolved) {
          setMapCoords({ lat: resolved.lat, lng: resolved.lng });
          return;
        }
      }

      const stored = readUserLocation();
      if (stored) {
        setMapCoords({ lat: stored.lat, lng: stored.lng });
      }
    };

    primeMapCoords();
  }, [addressEditorOpen, manualAddress]);

  useEffect(() => {
    if (!addressEditorOpen || !mapContainerRef.current) {
      return;
    }

    let isCancelled = false;

    const setupMap = async () => {
      // Lazy load Leaflet only when map is needed (PERFORMANCE OPTIMIZATION)
      // This prevents loading the entire Leaflet library (~100KB+) on pages that don't use maps
      const L = await import("leaflet");
      if (isCancelled || !mapContainerRef.current) {
        return;
      }

      if (!leafletMapRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
        }).setView([mapCoords.lat, mapCoords.lng], 16);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        map.on("movestart", () => {
          setIsMapMoving(true);
          if (reverseGeocodeTimerRef.current) {
            window.clearTimeout(reverseGeocodeTimerRef.current);
            reverseGeocodeTimerRef.current = null;
          }
        });

        map.on("moveend", async () => {
          setIsMapMoving(false);
          const center = map.getCenter();
          if (reverseGeocodeTimerRef.current) {
            window.clearTimeout(reverseGeocodeTimerRef.current);
          }

          reverseGeocodeTimerRef.current = window.setTimeout(() => {
            void syncAddressFromCoords(center.lat, center.lng);
          }, 300);
        });

        leafletMapRef.current = map;
      } else {
        const currentCenter = leafletMapRef.current.getCenter();
        const latDiff = Math.abs(currentCenter.lat - mapCoords.lat);
        const lngDiff = Math.abs(currentCenter.lng - mapCoords.lng);

        if (latDiff > 0.00001 || lngDiff > 0.00001) {
          leafletMapRef.current.setView([mapCoords.lat, mapCoords.lng], leafletMapRef.current.getZoom());
        }
      }

      window.setTimeout(() => {
        leafletMapRef.current?.invalidateSize();
      }, 120);
    };

    setupMap();

    return () => {
      isCancelled = true;
    };
  }, [addressEditorOpen, mapCoords]);

  const locateBySearch = async () => {
    const query = searchAddressText.trim();
    if (!query) {
      return;
    }

    const resolved = await geocodeArea(query);
    if (!resolved) {
      setErrorMessage("No location found for this search. Try a nearby landmark.");
      return;
    }

    await moveMapPin(resolved.lat, resolved.lng);
    setErrorMessage(null);
  };

  const applyCurrentLocationToPin = async () => {
    try {
      setIsResolvingPin(true);
      const detected = await detectUserLocation();
      await moveMapPin(detected.lat, detected.lng, false);
      setManualCity(detected.city || manualCity);
      setManualAddress(detected.fullAddress || manualAddress);
      setSearchAddressText(detected.fullAddress || "");
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to detect current location for map", error);
      setErrorMessage("Unable to detect current location. Search or drag the pin manually.");
    } finally {
      setIsResolvingPin(false);
    }
  };

  const selectedAddress = useMemo(
    () => addresses.find((item) => item.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const totalAmount = getCartTotal(cart);

  const resolvedCity = selectedAddress?.city || manualCity.trim();
  const resolvedAddress = selectedAddress?.addressLine || manualAddress.trim();
  const resolvedPhone = (selectedAddress?.phone || "").trim() || manualPhone.trim() || profilePhone.trim();

  const cartItems = cart?.items || [];

  const selectedPayment =
    PAYMENT_METHODS.find((method) => method.id === paymentMethod) || PAYMENT_METHODS.find((method) => method.id === "cod");

  const patchCartAddress = (city: string, addressLine: string) => {
    if (!cart) {
      return;
    }

    const nextCart = {
      ...cart,
      city,
      addressLine,
    };

    setCart(nextCart);
    writeShopCart(nextCart);
  };

  const chooseSavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setDefaultAddress(address.id);
    setManualCity(address.city);
    setManualAddress(address.addressLine);
    setManualPhone(address.phone || profilePhone);
    setReceiverName(address.label || receiverName);
    patchCartAddress(address.city, address.addressLine);
    setAddressSheetOpen(false);
    setStep("payment");
    setErrorMessage(null);
  };

  const openAddressEditor = () => {
    setAddressSheetOpen(false);
    setAddressEditorOpen(true);
    setErrorMessage(null);
  };

  const saveAddressFromEditor = () => {
    const city = manualCity.trim();
    const addressLine = manualAddress.trim();
    const phone = manualPhone.trim() || profilePhone.trim();

    if (!city || !addressLine) {
      setErrorMessage("Please add complete city and address details.");
      return;
    }

    if (!phone) {
      setErrorMessage("Please add phone number in receiver details.");
      return;
    }

    const label = addressLabel === "Other" ? "Other" : addressLabel;
    const updated = saveAddress({
      label,
      city,
      addressLine,
      phone,
      isDefault: true,
    });

    setAddresses(updated);
    const nextDefault = updated.find((item) => item.isDefault) || updated[0];
    if (nextDefault) {
      setSelectedAddressId(nextDefault.id);
      setDefaultAddress(nextDefault.id);
      patchCartAddress(nextDefault.city, nextDefault.addressLine);
    }

    setAddressEditorOpen(false);
    setStep("payment");
    setErrorMessage(null);
  };

  const updateQuantity = (itemId: string, nextQuantity: number) => {
    const updated = updateCartItemQuantity(itemId, nextQuantity);
    setCart(updated);
  };

  const placeOrder = async () => {
    if (!cart || cart.items.length === 0) {
      return;
    }

    const finalCity = resolvedCity;
    const finalAddress = resolvedAddress;
    const finalPhone = resolvedPhone;

    if (!finalCity || !finalAddress) {
      setErrorMessage("Please select delivery address before placing order.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("User details missing. Please login again.");
      return;
    }

    if (!finalPhone) {
      setErrorMessage("Please add phone number in address details.");
      return;
    }

    setPlacingOrder(true);
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/auth/login?next=%2Fcheckout");
        return;
      }

      const itemSummary = cart.items.map((item) => `${item.name} x${item.quantity}`).join(", ");
      const selectedPaymentLabel = selectedPayment?.label || "Cash on Delivery";

      const gatewayOrder = await createOrder({
        method: paymentMethod,
        amount: totalAmount,
        customer: {
          userId: session.user.id,
          name: customerName.trim(),
          phone: finalPhone,
        },
        metadata: {
          serviceId: cart.serviceId,
          vendorId: cart.vendorId,
          vendorName: cart.vendorName,
        },
      });

      if (!gatewayOrder.ok) {
        throw new Error(gatewayOrder.message || "Payment initialization failed.");
      }

      if (paymentMethod !== "cod") {
        const verification = await verifyPayment({
          method: paymentMethod,
          providerOrderId: gatewayOrder.providerOrderId,
          providerPaymentId: gatewayOrder.providerPaymentId,
          signature: gatewayOrder.signature,
          metadata: gatewayOrder.metadata,
        });

        if (!verification.verified) {
          throw new Error(verification.message || "Payment verification failed.");
        }
      }

      const bookingAddress = `${finalAddress} | City: ${finalCity} | Shop: ${cart.vendorName} | Items: ${itemSummary} | Payment: ${selectedPaymentLabel}`;

      const response = await fetch(apiUrl("/booking"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: cart.serviceId,
          customer_name: customerName.trim(),
          customer_phone: finalPhone,
          address: bookingAddress,
          preferred_time: new Date().toISOString(),
          user_id: session.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not create booking.");
      }

      const bookingId = String(data?.booking?.id || "");
      if (!bookingId) {
        throw new Error("Booking completed but booking id was not returned.");
      }

      router.push(`/booking/status?bookingId=${encodeURIComponent(bookingId)}`);
    } catch (error) {
      console.error("Failed to place order", error);
      setErrorMessage(error instanceof Error ? error.message : "Could not place order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!cart) {
    return (
      <main className="landing checkout-mobile-shell">
        <div className="checkout-empty-state">
          <h1>Your cart is empty</h1>
          <p>Add sub-services from a shop before checkout.</p>
          <button className="btn-book" type="button" onClick={() => router.push("/")}>Go to Home</button>
        </div>
      </main>
    );
  }

  return (
    <main className="landing checkout-mobile-shell">
      <div className="checkout-mobile-wrap">
        <section className="checkout-block" style={{ marginTop: "0.8rem" }}>
          <h2 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem" }}>Secure Checkout</h2>
          <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.85rem" }}>
            {step === "review" ? "Review service order" : "Select payment and place order"}
          </p>
        </section>

        <section className="checkout-saved-banner">
          {step === "review"
            ? `Estimated total: ${formatPrice(totalAmount)}`
            : `Payable amount: ${formatPrice(totalAmount)}`}
        </section>

        <div className="checkout-layout-grid">
          <section className="checkout-main-column">
            <section className="checkout-block checkout-delivery-card">
              <h3>{cart.vendorName}</h3>
              <p>Service provider confirmed for your selected items.</p>
              <div className="checkout-delivery-meta">
                <strong>Estimated arrival: 25-30 mins</strong>
                <button type="button" onClick={() => setAddressSheetOpen(true)}>Change address</button>
              </div>
            </section>

            <section className="checkout-block checkout-address-card">
              <div className="checkout-section-head">
                <h3>Service Address</h3>
                <button type="button" className="checkout-add-more" onClick={() => setAddressSheetOpen(true)}>
                  Edit
                </button>
              </div>
              <p className="checkout-address-line">
                {resolvedAddress
                  ? `${resolvedAddress}${resolvedCity ? `, ${resolvedCity}` : ""}`
                  : "No address selected yet. Select address to continue."}
              </p>
              {resolvedPhone ? <span className="checkout-address-meta">Contact: {resolvedPhone}</span> : null}
            </section>

            <section className="checkout-block checkout-items-card">
              <div className="checkout-section-head">
                <h3>Order items</h3>
                <button
                  type="button"
                  className="checkout-add-more"
                  onClick={() => router.push(`/shops/${encodeURIComponent(cart.vendorId)}?serviceId=${encodeURIComponent(cart.serviceId)}`)}
                >
                  Add more
                </button>
              </div>
              {cartItems.map((item) => (
                <div key={item.id} className="checkout-item-row">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{formatPrice(item.price)} each</p>
                  </div>
                  <div className="checkout-item-actions">
                    <button type="button" onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
              ))}
            </section>
          </section>

          <aside className="checkout-side-column">
            <section className="checkout-block checkout-bill-card">
              <div className="checkout-bill-row">
                <span>Order value</span>
                <strong>{formatPrice(totalAmount)}</strong>
              </div>
              <p>Includes service charges and taxes.</p>
            </section>

            {step === "payment" ? (
              <section className="checkout-block checkout-payment-card">
                <div className="checkout-section-head">
                  <h3>Payment method</h3>
                  <span className="checkout-security-pill">Secured checkout</span>
                </div>

                <div className="checkout-method-list">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      className={
                        paymentMethod === method.id
                          ? "checkout-method-row active"
                          : "checkout-method-row"
                      }
                      onClick={() => {
                        if (!method.available) {
                          return;
                        }
                        setPaymentMethod(method.id);
                      }}
                      disabled={!method.available}
                    >
                      <div>
                        <strong>{method.label}</strong>
                        <p>{method.subtitle}</p>
                      </div>
                      <span className={method.available ? "checkout-method-tag available" : "checkout-method-tag"}>
                        {method.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="checkout-policy-text">
              <h4>CANCELLATION POLICY</h4>
              <p>
                Free cancellation is available up to 30 minutes before your scheduled slot. View full details in our{" "}
                <Link href="/cancellation-refund-policy">Cancellation and Refund Policy</Link>.
              </p>
            </section>
          </aside>
        </div>

        {errorMessage ? <p className="checkout-error-text">{errorMessage}</p> : null}
      </div>

      <footer className="checkout-sticky-bar">
        {step === "review" ? (
          <button type="button" className="checkout-primary-cta" onClick={() => setAddressSheetOpen(true)}>
            Select address and continue
          </button>
        ) : (
          <div className="checkout-pay-bar">
            <div>
              <span>PAY USING</span>
              <strong>
                {selectedPayment?.label || "Cash on Delivery"}
              </strong>
            </div>
            <button type="button" onClick={placeOrder} disabled={placingOrder}>
              {placingOrder ? `Processing ${formatPrice(totalAmount)}` : `Place Order ${formatPrice(totalAmount)}`}
            </button>
          </div>
        )}
      </footer>

      {addressSheetOpen ? (
        <div className="checkout-overlay" onClick={() => setAddressSheetOpen(false)}>
          <section className="checkout-address-sheet" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="checkout-sheet-close" onClick={() => setAddressSheetOpen(false)}>
              x
            </button>
            <h2>Select an address</h2>

            <div className="checkout-address-list">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  type="button"
                  className="checkout-address-option"
                  onClick={() => chooseSavedAddress(address)}
                >
                  <strong>{address.label}</strong>
                  <span>{address.addressLine}</span>
                </button>
              ))}

              <button type="button" className="checkout-address-option checkout-add-address" onClick={openAddressEditor}>
                + Add Address
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {addressEditorOpen ? (
        <div className="checkout-overlay" onClick={() => setAddressEditorOpen(false)}>
          <section className="checkout-address-editor" onClick={(event) => event.stopPropagation()}>
            <header>
              <button type="button" onClick={() => setAddressEditorOpen(false)}>&lt;</button>
              <input
                value={searchAddressText}
                onChange={(event) => setSearchAddressText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void locateBySearch();
                  }
                }}
                placeholder="Search for area, street name..."
              />
              <button type="button" className="checkout-search-go" onClick={() => void locateBySearch()}>
                Go
              </button>
            </header>

            <div className="checkout-map-panel">
              <p>{isResolvingPin ? "Updating address from selected pin..." : "Move pin to your exact delivery location"}</p>
              <div className="checkout-map-wrap">
                <div ref={mapContainerRef} className="checkout-map-canvas" />
                <div className={isMapMoving ? "checkout-map-pin-fixed is-moving" : "checkout-map-pin-fixed"} aria-hidden="true"><span /></div>
              </div>
              <button type="button" onClick={() => void applyCurrentLocationToPin()}>
                Use current location
              </button>
            </div>

            <div className="checkout-editor-form">
              <label>
                Delivery details
                <textarea
                  rows={2}
                  value={manualAddress}
                  onChange={(event) => setManualAddress(event.target.value)}
                  className={isResolvingPin ? "is-loading" : ""}
                  placeholder="Flat, Floor, Area, Landmark"
                />
              </label>

              <p className={isResolvingPin ? "checkout-geocode-hint active" : "checkout-geocode-hint"} aria-live="polite">
                {isResolvingPin ? "Locating address from map pin..." : "Pin location is synced with delivery address."}
              </p>

              <label>
                City
                <input
                  value={manualCity}
                  onChange={(event) => setManualCity(event.target.value)}
                  placeholder="City"
                />
              </label>

              <label>
                Receiver details
                <input
                  value={manualPhone}
                  onChange={(event) => setManualPhone(event.target.value)}
                  placeholder="Phone number"
                />
              </label>

              <label>
                Receiver name
                <input
                  value={receiverName}
                  onChange={(event) => setReceiverName(event.target.value)}
                  placeholder="Name"
                />
              </label>

              <div className="checkout-label-row">
                {[
                  "Home",
                  "Work",
                  "Other",
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={addressLabel === label ? "active" : ""}
                    onClick={() => setAddressLabel(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="checkout-primary-cta" onClick={saveAddressFromEditor}>
              Save address
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
