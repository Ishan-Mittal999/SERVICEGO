"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { reverseGeocode } from "@/lib/location";

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
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const reverse = await reverseGeocode(latitude, longitude);
          const fullAddress = reverse.display_name || "";
          const withCoordinates = `${fullAddress || "Detected location"} (Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)})`;
          setArea(withCoordinates);
        } catch {
          setArea(`Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`);
        }

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
    <div className="auth-shell auth-shell--alt">
      <div className="auth-card" style={{ maxWidth: "560px" }}>
        <h1 className="auth-title">Complete Vendor Profile</h1>
        <p className="auth-subtitle">
          Add your shop details before entering dashboard.
        </p>

        <form onSubmit={saveVendorProfile} className="auth-form" style={{ marginTop: "1.2rem" }}>
          <label className="auth-label">
            Shop Name
          </label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">
            Phone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">
            Service Category
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
            className="auth-select auth-select--spaced"
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>

          <label className="auth-label">
            Experience (years)
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            required
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">
            Shop Area / Location
          </label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Area, city, or coordinates"
            required
            className="auth-input"
          />

          <button
            type="button"
            onClick={useCurrentLocation}
            className="auth-secondary-btn"
            style={{
              marginTop: "0.65rem",
              width: "auto",
              padding: "0.6rem 0.95rem",
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
            className="auth-primary-btn"
            style={{ opacity: isSubmitting ? 0.8 : 1 }}
          >
            {isSubmitting ? "Saving profile..." : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
