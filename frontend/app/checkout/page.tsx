"use client";

import { useEffect, useMemo, useState } from "react";
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
  reverseGeocode,
} from "@/lib/location";
import {
  createOrder,
  verifyPayment,
  type PaymentGatewayMethod,
} from "../../lib/payment-gateway";

type CheckoutStep = "review" | "payment";
type PaymentMethod = PaymentGatewayMethod;

const normalizeVisibleAddress = (value: string) => {
  return value
    .replace(/\(?\s*-?\d{1,2}\.\d+\s*,\s*-?\d{1,3}\.\d+\s*\)?/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,+$/g, "")
    .trim();
};

const getDigitsOnly = (value: string) => value.replace(/\D/g, "");

const normalizeIndianPhone = (value: string) => {
  const digits = getDigitsOnly(value);

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
};

const isValidIndianMobile = (value: string) => /^\d{10}$/.test(normalizeIndianPhone(value));

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const currentCart = readShopCart();
    setCart(currentCart);

    const currentAddresses = readAddressBook();
    setAddresses(currentAddresses);

    const defaultAddress = getDefaultAddress();
    if (defaultAddress) {
      setSelectedAddressId(defaultAddress.id);
      setManualCity(defaultAddress.city);
      setManualAddress(normalizeVisibleAddress(defaultAddress.addressLine));
      setManualPhone(normalizeIndianPhone(defaultAddress.phone || ""));
      setReceiverName(defaultAddress.label || "");
    } else if (currentCart) {
      setManualCity(currentCart.city || "");
      setManualAddress(normalizeVisibleAddress(currentCart.addressLine || ""));
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
        const normalizedMetadataPhone = normalizeIndianPhone(metadataPhone);
        setProfilePhone(normalizedMetadataPhone);
        setManualPhone((current) => current || normalizedMetadataPhone);
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

  const syncAddressFromCoords = async (lat: number, lng: number) => {
    setIsResolvingPin(true);

    try {
      const reverse = await reverseGeocode(lat, lng);

      const city = reverse.address?.city || reverse.address?.town || reverse.address?.village || "";
      const display = normalizeVisibleAddress(reverse.display_name || "");

      if (city) {
        setManualCity(city);
      }
      if (display) {
        setManualAddress(display);
        setSearchAddressText(display);
      }
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to resolve address from location", error);
      setErrorMessage("Could not fetch address for selected location. You can still type it manually.");
    } finally {
      setIsResolvingPin(false);
    }
  };

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

    await syncAddressFromCoords(resolved.lat, resolved.lng);
    setErrorMessage(null);
  };

  const applyCurrentLocationToPin = async () => {
    try {
      setIsResolvingPin(true);
      const detected = await detectUserLocation();
      const visibleAddress = normalizeVisibleAddress(detected.fullAddress || "");
      setManualCity(detected.city || manualCity);
      setManualAddress(visibleAddress || manualAddress);
      setSearchAddressText(visibleAddress || "");

      if (!visibleAddress) {
        await syncAddressFromCoords(detected.lat, detected.lng);
      }

      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to detect current location", error);
      setErrorMessage("Unable to detect current location. Search or enter address manually.");
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
  const resolvedAddress = normalizeVisibleAddress(selectedAddress?.addressLine || manualAddress.trim());
  const resolvedPhone = normalizeIndianPhone((selectedAddress?.phone || "").trim() || manualPhone.trim() || profilePhone.trim());
  const hasTypedPhone = manualPhone.trim().length > 0;
  const showPhoneValidationError = hasTypedPhone && !isValidIndianMobile(manualPhone);
  const canSaveAddress = Boolean(
    manualCity.trim()
    && normalizeVisibleAddress(manualAddress.trim())
    && receiverName.trim()
    && isValidIndianMobile(manualPhone)
  );
  const canPlaceOrder = Boolean(
    !placingOrder
    && resolvedCity
    && resolvedAddress
    && customerName.trim()
    && isValidIndianMobile(resolvedPhone)
  );

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
    setManualAddress(normalizeVisibleAddress(address.addressLine));
    setManualPhone(normalizeIndianPhone(address.phone || profilePhone));
    setReceiverName(address.label || receiverName);
    patchCartAddress(address.city, normalizeVisibleAddress(address.addressLine));
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
    const addressLine = normalizeVisibleAddress(manualAddress.trim());
    const phone = normalizeIndianPhone(manualPhone.trim() || profilePhone.trim());
    const name = receiverName.trim();

    if (!city || !addressLine) {
      setErrorMessage("Please add complete city and address details.");
      return;
    }

    if (!phone) {
      setErrorMessage("Please add phone number in receiver details.");
      return;
    }

    if (!isValidIndianMobile(phone)) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!name) {
      setErrorMessage("Please add receiver name.");
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

    setManualPhone(phone);
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

    if (!isValidIndianMobile(finalPhone)) {
      setErrorMessage("Please enter a valid 10-digit mobile number before placing order.");
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
              {resolvedPhone && !isValidIndianMobile(resolvedPhone) ? (
                <span className="checkout-address-meta" style={{ color: "#b91c1c" }}>
                  Update contact number to a valid 10-digit Indian mobile number.
                </span>
              ) : null}
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
            <button type="button" onClick={placeOrder} disabled={!canPlaceOrder}>
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
                  <span>{normalizeVisibleAddress(address.addressLine)}</span>
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
              <p>{isResolvingPin ? "Updating address..." : "Use current location or search and save your address."}</p>
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
                {isResolvingPin ? "Locating address..." : "Address is auto-filled from your selected location."}
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
                  onChange={(event) => setManualPhone(normalizeIndianPhone(event.target.value).slice(0, 10))}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Phone number"
                />
              </label>

              <p className={showPhoneValidationError ? "checkout-geocode-hint active" : "checkout-geocode-hint"} aria-live="polite">
                {showPhoneValidationError
                  ? "Enter a valid 10-digit mobile number."
                  : "Phone number must be 10 digits."}
              </p>

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

            <button type="button" className="checkout-primary-cta" onClick={saveAddressFromEditor} disabled={!canSaveAddress || isResolvingPin}>
              Save address
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
