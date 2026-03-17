"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { isVendorUser } from "@/lib/user-role";
import {
  readAddressBook,
  removeAddress,
  saveAddress,
  setDefaultAddress,
  type SavedAddress,
} from "@/lib/address-book";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVendor, setIsVendor] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressLabel, setAddressLabel] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressPhone, setAddressPhone] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.replace("/auth/login?next=%2Fprofile");
        return;
      }

      const vendorAccount = await isVendorUser(currentUser.id);

      if (isMounted) {
        setUser(currentUser);
        setIsVendor(vendorAccount);
        setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const username = useMemo(() => {
    if (!user?.email) {
      return "Unknown";
    }
    return user.email.split("@")[0];
  }, [user]);

  useEffect(() => {
    setAddresses(readAddressBook());
  }, []);

  const addAddress = () => {
    if (!addressLabel.trim() || !addressCity.trim() || !addressLine.trim() || !addressPhone.trim()) {
      return;
    }

    const updated = saveAddress({
      label: addressLabel,
      city: addressCity,
      addressLine,
      phone: addressPhone,
      isDefault: addresses.length === 0,
    });

    setAddresses(updated);
    setAddressLabel("");
    setAddressCity("");
    setAddressLine("");
    setAddressPhone("");
  };

  if (loading) {
    return (
      <main
        className="landing"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem 1rem" }}
      >
        <p style={{ color: "var(--gray-500)" }}>Loading profile...</p>
      </main>
    );
  }

  return (
    <main
      className="landing"
      style={{
        minHeight: "100vh",
        padding: "6rem 1rem 3rem",
        background:
          "radial-gradient(circle at 88% 10%, rgba(122,106,0,0.13), transparent 35%), radial-gradient(circle at 12% 14%, rgba(30,144,255,0.1), transparent 36%), var(--off-white)",
      }}
    >
      <div className="container" style={{ maxWidth: "760px" }}>
        <button
          type="button"
          onClick={() => router.push("/")}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--gray-500)",
            fontSize: "0.9rem",
            padding: 0,
            marginBottom: "1rem",
            cursor: "pointer",
          }}
        >
          {"<- Back to Home"}
        </button>

        <section
          style={{
            background: "var(--white)",
            border: "1px solid var(--gray-200)",
            borderRadius: "18px",
            boxShadow: "var(--shadow-lg)",
            padding: "1.4rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.2rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, rgba(122,106,0,0.16), rgba(166,138,0,0.26))",
                color: "var(--gold)",
                fontSize: "1.45rem",
                fontWeight: 800,
              }}
            >
              {username.charAt(0).toUpperCase()}
            </div>

            <div>
              <h1 style={{ margin: 0, color: "var(--gray-800)", fontFamily: "var(--font-display)", fontSize: "1.85rem" }}>
                My Profile
              </h1>
              <p style={{ marginTop: "0.35rem", color: "var(--gray-500)", fontSize: "0.95rem" }}>
                View your account details and quick actions.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gap: "0.7rem" }}>
            <ProfileRow label="Username" value={username} />
            <ProfileRow label="Email" value={user?.email || "-"} />
            <ProfileRow label="Account Type" value={isVendor ? "Vendor" : "Customer"} />
            <ProfileRow label="User ID" value={user?.id || "-"} />
            <ProfileRow label="Created At" value={user?.created_at ? new Date(user.created_at).toLocaleString() : "-"} />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
            <button
              type="button"
              className="btn-book"
              onClick={() => router.push(isVendor ? "/vendor/dashboard" : "/bookings")}
            >
              {isVendor ? "Open Dashboard" : "My Bookings"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/");
              }}
              style={{
                borderRadius: "999px",
                border: "1px solid var(--gray-300)",
                background: "var(--white)",
                color: "var(--gray-700)",
                fontWeight: 600,
                padding: "0.72rem 1.1rem",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>

          <div style={{ marginTop: "1.4rem", paddingTop: "1.1rem", borderTop: "1px solid var(--gray-200)" }}>
            <h2 style={{ margin: 0, color: "var(--gray-800)", fontSize: "1.2rem" }}>Address Book</h2>
            <p style={{ marginTop: "0.3rem", color: "var(--gray-500)", fontSize: "0.9rem" }}>
              Saved addresses are used during checkout and can be changed on payment page.
            </p>

            <div style={{ display: "grid", gap: "0.65rem", marginTop: "0.8rem" }}>
              <input
                value={addressLabel}
                onChange={(event) => setAddressLabel(event.target.value)}
                placeholder="Label (Home, Office)"
                style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem" }}
              />
              <input
                value={addressCity}
                onChange={(event) => setAddressCity(event.target.value)}
                placeholder="City"
                style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem" }}
              />
              <textarea
                rows={3}
                value={addressLine}
                onChange={(event) => setAddressLine(event.target.value)}
                placeholder="Full address"
                style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem", resize: "vertical" }}
              />
              <input
                value={addressPhone}
                onChange={(event) => setAddressPhone(event.target.value)}
                placeholder="Phone number"
                style={{ borderRadius: "10px", border: "1px solid var(--gray-300)", padding: "0.72rem 0.85rem" }}
              />
              <button
                type="button"
                onClick={addAddress}
                style={{
                  width: "fit-content",
                  borderRadius: "999px",
                  border: "1px solid var(--gray-300)",
                  background: "var(--white)",
                  color: "var(--gray-700)",
                  fontWeight: 700,
                  padding: "0.6rem 1rem",
                  cursor: "pointer",
                }}
              >
                Save Address
              </button>
            </div>

            <div style={{ marginTop: "1rem", display: "grid", gap: "0.7rem" }}>
              {addresses.length === 0 ? (
                <p style={{ color: "var(--gray-500)", margin: 0 }}>No saved addresses yet.</p>
              ) : (
                addresses.map((address) => (
                  <article
                    key={address.id}
                    style={{
                      border: "1px solid var(--gray-200)",
                      borderRadius: "12px",
                      background: "var(--gray-50)",
                      padding: "0.82rem 0.9rem",
                      display: "grid",
                      gap: "0.4rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ color: "var(--gray-800)" }}>
                        {address.label} {address.isDefault ? "(Default)" : ""}
                      </strong>
                      <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                        {!address.isDefault ? (
                          <button
                            type="button"
                            onClick={() => setAddresses(setDefaultAddress(address.id))}
                            style={{
                              borderRadius: "999px",
                              border: "1px solid var(--gray-300)",
                              background: "var(--white)",
                              color: "var(--gray-700)",
                              padding: "0.42rem 0.72rem",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                            }}
                          >
                            Set Default
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setAddresses(removeAddress(address.id))}
                          style={{
                            borderRadius: "999px",
                            border: "1px solid #ef4444",
                            background: "#fff",
                            color: "#b42318",
                            padding: "0.42rem 0.72rem",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: 0, color: "var(--gray-600)", fontSize: "0.88rem" }}>{address.city}</p>
                    <p style={{ margin: 0, color: "var(--gray-700)", fontSize: "0.9rem" }}>{address.addressLine}</p>
                    <p style={{ margin: 0, color: "var(--gray-700)", fontSize: "0.88rem" }}>
                      Phone: {address.phone || "Not set"}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="profile-row"
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: "0.8rem",
        background: "var(--gray-50)",
        border: "1px solid var(--gray-200)",
        borderRadius: "12px",
        padding: "0.78rem 0.9rem",
      }}
    >
      <strong style={{ color: "var(--gray-600)", fontSize: "0.88rem" }}>{label}</strong>
      <span style={{ color: "var(--gray-800)", fontSize: "0.92rem", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}
