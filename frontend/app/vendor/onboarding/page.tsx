"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";

type Service = {
  id: string;
  name: string;
};

export default function VendorOnboardingPage() {
  const router = useRouter();

  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [experience, setExperience] = useState("1");
  const [area, setArea] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    const phoneParam = params.get("phone");

    if (name) setShopName(name);
    if (phoneParam) setPhone(phoneParam);

    const loadServices = async () => {
      try {
        const res = await fetch(apiUrl("/services"));
        const data = await res.json();
        if (Array.isArray(data)) {
          setServices(data);
          if (data.length > 0) {
            setServiceId(data[0].id);
          }
        }
      } catch {
        setErrorMessage("Could not load service list.");
      }
    };

    loadServices();
  }, []);

  const useCurrentLocation = () => {
    setErrorMessage(null);
    if (!navigator.geolocation) {
      setErrorMessage("Location is not supported by your browser.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setArea(`Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`);
        setIsGettingLocation(false);
      },
      () => {
        setErrorMessage("Location permission denied. You can enter area manually.");
        setIsGettingLocation(false);
      }
    );
  };

  const saveVendorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("You are not logged in. Please login again.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      auth_user_id: user.id,
      name: shopName,
      phone,
      service_id: serviceId || null,
      area,
      experience: Number(experience),
      is_active: true,
    };

    const { error } = await supabase
      .from("vendors")
      .upsert(payload as never, { onConflict: "auth_user_id" });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/vendor/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1rem",
        background:
          "radial-gradient(circle at 82% 18%, rgba(122,106,0,0.14), transparent 40%), radial-gradient(circle at 14% 12%, rgba(30,144,255,0.12), transparent 34%), var(--off-white)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "var(--white)",
          borderRadius: "18px",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--gray-200)",
          padding: "1.5rem",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2rem",
            color: "var(--gray-800)",
            margin: 0,
          }}
        >
          Complete Vendor Profile
        </h1>
        <p style={{ marginTop: "0.6rem", color: "var(--gray-500)" }}>
          Add your shop details before entering dashboard.
        </p>

        <form onSubmit={saveVendorProfile} style={{ marginTop: "1.2rem" }}>
          <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>
            Shop Name
          </label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: "0.45rem",
              marginBottom: "0.9rem",
              padding: "0.78rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              background: "var(--gray-50)",
            }}
          />

          <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>
            Phone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: "0.45rem",
              marginBottom: "0.9rem",
              padding: "0.78rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              background: "var(--gray-50)",
            }}
          />

          <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>
            Service Category
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: "0.45rem",
              marginBottom: "0.9rem",
              padding: "0.78rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              background: "var(--gray-50)",
            }}
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>

          <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>
            Experience (years)
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: "0.45rem",
              marginBottom: "0.9rem",
              padding: "0.78rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              background: "var(--gray-50)",
            }}
          />

          <label style={{ fontSize: "0.88rem", color: "var(--gray-600)" }}>
            Shop Area / Location
          </label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Area, city, or coordinates"
            required
            style={{
              width: "100%",
              marginTop: "0.45rem",
              padding: "0.78rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              background: "var(--gray-50)",
            }}
          />

          <button
            type="button"
            onClick={useCurrentLocation}
            style={{
              marginTop: "0.65rem",
              padding: "0.6rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid var(--gray-300)",
              background: "var(--white)",
              color: "var(--gray-700)",
              fontWeight: 600,
            }}
          >
            {isGettingLocation ? "Fetching location..." : "Use Current Location"}
          </button>

          {errorMessage ? (
            <p style={{ color: "#b42318", marginTop: "0.8rem", fontSize: "0.88rem" }}>
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              marginTop: "1rem",
              padding: "0.86rem 1rem",
              borderRadius: "999px",
              border: "none",
              background: "linear-gradient(135deg, var(--gold), var(--gold-light))",
              color: "var(--white)",
              fontWeight: 700,
              boxShadow: "var(--shadow-gold)",
              opacity: isSubmitting ? 0.8 : 1,
            }}
          >
            {isSubmitting ? "Saving profile..." : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
