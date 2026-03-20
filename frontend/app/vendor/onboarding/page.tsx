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
  const [ownerName, setOwnerName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [aboutShop, setAboutShop] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("20:00");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("10");
  const [minimumOrderValue, setMinimumOrderValue] = useState("0");
  const [subServicesText, setSubServicesText] = useState("");
  const [shopImageUrls, setShopImageUrls] = useState<string[]>([]);
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const oversized = files.find((file) => file.size > 1.5 * 1024 * 1024);
    if (oversized) {
      setErrorMessage("Please upload images smaller than 1.5MB each.");
      return;
    }

    const imageData = await Promise.all(
      files.slice(0, 5).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Could not read image"));
            reader.readAsDataURL(file);
          })
      )
    ).catch(() => {
      setErrorMessage("Could not process uploaded images.");
      return [] as string[];
    });

    if (imageData.length > 0) {
      setShopImageUrls(imageData.filter(Boolean));
      setErrorMessage(null);
    }
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

    const parsedSubServices = subServicesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      auth_user_id: user.id,
      name: shopName,
      phone,
      service_id: serviceId || null,
      area,
      experience: Number(experience),
      is_active: true,
      owner_name: ownerName || null,
      business_address: businessAddress || null,
      city: city || null,
      pincode: pincode || null,
      gst_number: gstNumber || null,
      about_shop: aboutShop || null,
      open_time: openTime || null,
      close_time: closeTime || null,
      service_radius_km: Number(serviceRadiusKm) || null,
      minimum_order_value: Number(minimumOrderValue) || 0,
      sub_services: parsedSubServices,
      shop_image_urls: shopImageUrls,
    };

    let { error } = await supabase
      .from("vendors")
      .upsert(payload as never, { onConflict: "auth_user_id" });

    // Fallback for installations where advanced vendor columns are not yet present.
    if (error) {
      const basePayload = {
        auth_user_id: user.id,
        name: shopName,
        phone,
        service_id: serviceId || null,
        area,
        experience: Number(experience),
        is_active: true,
      };

      const fallbackResult = await supabase
        .from("vendors")
        .upsert(basePayload as never, { onConflict: "auth_user_id" });
      error = fallbackResult.error;
    }

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
            Owner Name
          </label>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
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

          <label className="auth-label" style={{ marginTop: "0.85rem" }}>
            Business Address
          </label>
          <input
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            placeholder="Street, landmark, locality"
            required
            className="auth-input auth-input--spaced"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <div>
              <label className="auth-label">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="auth-input auth-input--spaced"
              />
            </div>
            <div>
              <label className="auth-label">Pincode</label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                pattern="[0-9]{6}"
                required
                className="auth-input auth-input--spaced"
              />
            </div>
          </div>

          <label className="auth-label">
            GST Number (optional)
          </label>
          <input
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            className="auth-input auth-input--spaced"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <div>
              <label className="auth-label">Opening Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                required
                className="auth-input auth-input--spaced"
              />
            </div>
            <div>
              <label className="auth-label">Closing Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                required
                className="auth-input auth-input--spaced"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <div>
              <label className="auth-label">Service Radius (km)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(e.target.value)}
                required
                className="auth-input auth-input--spaced"
              />
            </div>
            <div>
              <label className="auth-label">Minimum Order Value</label>
              <input
                type="number"
                min={0}
                value={minimumOrderValue}
                onChange={(e) => setMinimumOrderValue(e.target.value)}
                className="auth-input auth-input--spaced"
              />
            </div>
          </div>

          <label className="auth-label">Sub-services offered</label>
          <textarea
            value={subServicesText}
            onChange={(e) => setSubServicesText(e.target.value)}
            placeholder="Pipe leakage repair, Tap installation, Tank cleaning"
            rows={3}
            className="auth-input auth-input--spaced"
            style={{ resize: "vertical", minHeight: 90, paddingTop: 12 }}
          />

          <label className="auth-label">Shop Images (Upload your own)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="auth-input auth-input--spaced"
          />

          {shopImageUrls.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.4rem" }}>
              {shopImageUrls.map((image, index) => (
                <img
                  key={`${index}-${image.slice(0, 24)}`}
                  src={image}
                  alt={`Shop preview ${index + 1}`}
                  style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #dfe3ea" }}
                />
              ))}
            </div>
          ) : (
            <p style={{ margin: "0 0 0.8rem", fontSize: "0.85rem", color: "#667085" }}>
              No shop image uploaded yet. Your shop card will show a neutral placeholder until you upload.
            </p>
          )}

          <label className="auth-label">About your shop</label>
          <textarea
            value={aboutShop}
            onChange={(e) => setAboutShop(e.target.value)}
            placeholder="Tell customers about your service quality, team, and specialties"
            rows={3}
            className="auth-input auth-input--spaced"
            style={{ resize: "vertical", minHeight: 90, paddingTop: 12 }}
          />

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
