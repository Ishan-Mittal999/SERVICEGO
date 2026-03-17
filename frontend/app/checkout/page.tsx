"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { formatPrice } from "@/lib/booking-flow";
import { getCartTotal, readShopCart, type ShopCart } from "@/lib/shop-cart";
import {
  getDefaultAddress,
  readAddressBook,
  saveAddress,
  setDefaultAddress,
  type SavedAddress,
} from "@/lib/address-book";

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart] = useState<ShopCart | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [saveToAddressBook, setSaveToAddressBook] = useState(false);
  const [isChangingAddress, setIsChangingAddress] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
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
      setManualAddress(defaultAddress.addressLine);
      setManualPhone(defaultAddress.phone || "");
    } else if (currentCart) {
      setManualCity(currentCart.city || "");
      setManualAddress(currentCart.addressLine || "");
      setIsChangingAddress(true);
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

  const selectedAddress = useMemo(
    () => addresses.find((item) => item.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const totalAmount = getCartTotal(cart);

  const placeOrder = async () => {
    if (!cart || cart.items.length === 0) {
      return;
    }

    const finalCity = isChangingAddress ? manualCity.trim() : selectedAddress?.city || "";
    const finalAddress = isChangingAddress ? manualAddress.trim() : selectedAddress?.addressLine || "";
    const finalPhone = isChangingAddress
      ? manualPhone.trim()
      : (selectedAddress?.phone || "").trim() || profilePhone.trim();

    if (!finalCity || !finalAddress) {
      setErrorMessage("Please select or enter delivery address.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Please enter customer name.");
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
      const bookingAddress = `${finalAddress} | City: ${finalCity} | Shop: ${cart.vendorName} | Items: ${itemSummary}`;

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

      if (saveToAddressBook || isChangingAddress) {
        const updated = saveAddress({
          label: `${finalCity} Address`,
          city: finalCity,
          addressLine: finalAddress,
          phone: finalPhone,
          isDefault: true,
        });
        setAddresses(updated);
        const nextDefault = updated.find((item) => item.isDefault);
        if (nextDefault) {
          setSelectedAddressId(nextDefault.id);
          setDefaultAddress(nextDefault.id);
        }
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
      <main className="landing" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ marginBottom: "0.5rem", color: "var(--gray-800)" }}>Your cart is empty</h1>
          <p style={{ color: "var(--gray-500)" }}>Add sub-services from a shop before checkout.</p>
          <button className="btn-book" type="button" onClick={() => router.push("/")}>Go to Home</button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="landing mobile-page-shell"
      style={{
        minHeight: "100vh",
        padding: "6rem 1rem 2rem",
        background:
          "radial-gradient(circle at 82% 10%, rgba(122,106,0,0.12), transparent 35%), radial-gradient(circle at 12% 12%, rgba(30,144,255,0.1), transparent 35%), var(--off-white)",
      }}
    >
      <div className="container" style={{ maxWidth: "900px" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", color: "var(--gray-800)" }}>Checkout & Payment</h1>
        <p style={{ marginTop: "0.4rem", color: "var(--gray-500)" }}>
          Review cart, confirm address, and place your booking.
        </p>

        <section className="checkout-layout" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1rem" }}>
          <div style={{ background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "14px", padding: "1rem" }}>
            <h3 style={{ marginTop: 0, color: "var(--gray-800)" }}>Address & Contact</h3>

            {addresses.length > 0 ? (
              <div style={{ display: "grid", gap: "0.7rem" }}>
                <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>Saved address</label>
                <select
                  value={selectedAddressId}
                  onChange={(event) => {
                    setSelectedAddressId(event.target.value);
                    setIsChangingAddress(false);
                  }}
                  style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem" }}
                >
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.label} - {address.city}
                    </option>
                  ))}
                </select>

                {!isChangingAddress && selectedAddress ? (
                  <div style={{ background: "var(--gray-50)", border: "1px solid var(--gray-200)", borderRadius: "10px", padding: "0.75rem" }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "var(--gray-700)" }}>{selectedAddress.city}</p>
                    <p style={{ marginTop: "0.3rem", marginBottom: 0, color: "var(--gray-600)", fontSize: "0.9rem" }}>
                      {selectedAddress.addressLine}
                    </p>
                    <p style={{ marginTop: "0.3rem", marginBottom: 0, color: "var(--gray-600)", fontSize: "0.9rem" }}>
                      Phone: {selectedAddress.phone || profilePhone || "Not set"}
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsChangingAddress((value) => !value)}
                  style={{
                    borderRadius: "999px",
                    border: "1px solid var(--gray-300)",
                    background: "var(--white)",
                    padding: "0.58rem 0.9rem",
                    width: "fit-content",
                    cursor: "pointer",
                  }}
                >
                  {isChangingAddress ? "Use saved address" : "Change address"}
                </button>
              </div>
            ) : null}

            {(addresses.length === 0 || isChangingAddress) && (
              <div style={{ display: "grid", gap: "0.7rem", marginTop: addresses.length > 0 ? "0.8rem" : 0 }}>
                <input
                  value={manualCity}
                  onChange={(event) => setManualCity(event.target.value)}
                  placeholder="City"
                  style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem" }}
                />
                <textarea
                  rows={3}
                  value={manualAddress}
                  onChange={(event) => setManualAddress(event.target.value)}
                  placeholder="Full address"
                  style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem", resize: "vertical" }}
                />
                <input
                  value={manualPhone}
                  onChange={(event) => setManualPhone(event.target.value)}
                  placeholder="Phone number"
                  style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem" }}
                />
                <label style={{ display: "flex", gap: "0.45rem", alignItems: "center", fontSize: "0.9rem", color: "var(--gray-600)" }}>
                  <input
                    type="checkbox"
                    checked={saveToAddressBook}
                    onChange={(event) => setSaveToAddressBook(event.target.checked)}
                  />
                  Save this in address book
                </label>
              </div>
            )}

            <div style={{ display: "grid", gap: "0.7rem", marginTop: "1rem" }}>
              <input
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Customer name"
                style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem" }}
              />
            </div>

            {errorMessage ? <p style={{ color: "#b42318", marginTop: "0.8rem" }}>{errorMessage}</p> : null}
          </div>

          <aside style={{ background: "var(--white)", border: "1px solid var(--gray-200)", borderRadius: "14px", padding: "1rem" }}>
            <h3 style={{ marginTop: 0, color: "var(--gray-800)" }}>Cart Summary</h3>
            <p style={{ marginTop: "0.2rem", color: "var(--gray-500)", fontSize: "0.9rem" }}>{cart.vendorName}</p>

            <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.8rem" }}>
              {cart.items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem" }}>
                  <span style={{ color: "var(--gray-700)", fontSize: "0.9rem", wordBreak: "break-word" }}>
                    {item.name} x{item.quantity}
                  </span>
                  <strong style={{ color: "var(--gray-800)", fontSize: "0.9rem" }}>
                    {formatPrice(item.price * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "0.9rem", paddingTop: "0.75rem", borderTop: "1px solid var(--gray-200)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--gray-600)", fontWeight: 700 }}>To Pay</span>
              <strong style={{ color: "var(--gray-900)", fontSize: "1.1rem" }}>{formatPrice(totalAmount)}</strong>
            </div>

            <button
              className="btn-book"
              type="button"
              onClick={placeOrder}
              disabled={placingOrder}
              style={{ width: "100%", marginTop: "0.9rem", opacity: placingOrder ? 0.8 : 1 }}
            >
              {placingOrder ? "Processing..." : "Proceed to Payment"}
            </button>
          </aside>
        </section>
      </div>
    </main>
  );
}
