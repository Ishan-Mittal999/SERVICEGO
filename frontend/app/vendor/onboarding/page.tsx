"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { reverseGeocode } from "@/lib/location";

type Service = {
  id: string;
  name: string;
};

type ServiceOption = {
  key: string;
  id: string | null;
  name: string;
};

type ServicemanForm = {
  name: string;
  phone: string;
  aadharNumber: string;
  serviceCategory: string;
  photo: string;
  aadharPhoto: string;
};

const REQUIRED_SERVICE_NAMES = [
  "AC Repair",
  "Washing Machine Repair",
  "Chimney Repair",
  "Iron/Press Repair",
  "Refrigerator Repair",
  "Geyser Service",
  "RO Service",
  "Microwave Repair",
  "Mixer Repair",
  "Heater Repair",
  "Kettle Repair",
  "Cooler Repair",
];

const SUBSERVICE_PRESETS: Record<string, string[]> = {
  ac: ["Foam jet service", "AC checkup", "AC installation", "AC uninstallation"],
  washing_machine: ["Semi automatic machine repair", "Automatic top load repair", "Automatic front load repair"],
  geyser: ["Install", "Uninstall", "Repair"],
};

const normalizeServiceName = (value: string) => value.trim().toLowerCase();

const getServiceKey = (serviceName: string) => {
  const normalized = normalizeServiceName(serviceName);

  if (normalized.includes("ac")) return "ac";
  if (normalized.includes("washing")) return "washing_machine";
  if (normalized.includes("geyser")) return "geyser";
  if (normalized.includes("chimney")) return "chimney";
  if (normalized.includes("iron") || normalized.includes("press")) return "press";
  if (normalized.includes("refrigerator") || normalized.includes("fridge")) return "refrigerator";
  if (normalized.includes("ro") || normalized.includes("purifier")) return "ro";
  if (normalized.includes("microwave")) return "microwave";
  if (normalized.includes("mixer")) return "mixer";
  if (normalized.includes("heater")) return "heater";
  if (normalized.includes("kettle")) return "kettle";
  if (normalized.includes("cooler")) return "cooler";

  return normalized.replace(/\s+/g, "_");
};

const readFilesAsDataUrl = async (files: File[]) => {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Could not read image"));
          reader.readAsDataURL(file);
        })
    )
  );
};

const buildDefaultServiceman = (): ServicemanForm => ({
  name: "",
  phone: "",
  aadharNumber: "",
  serviceCategory: "",
  photo: "",
  aadharPhoto: "",
});

export default function VendorOnboardingPage() {
  const router = useRouter();

  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
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
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [selectedServiceKeys, setSelectedServiceKeys] = useState<string[]>([]);
  const [selectedSubServices, setSelectedSubServices] = useState<string[]>([]);
  const [otherSubServicesText, setOtherSubServicesText] = useState("");
  const [shopImageUrls, setShopImageUrls] = useState<string[]>([]);
  const [servicemanCount, setServicemanCount] = useState("1");
  const [servicemen, setServicemen] = useState<ServicemanForm[]>([buildDefaultServiceman()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedServices = useMemo(
    () => serviceOptions.filter((service) => selectedServiceKeys.includes(service.key)),
    [serviceOptions, selectedServiceKeys]
  );

  const subServiceMcqOptions = useMemo(() => {
    const all = new Set<string>();

    selectedServices.forEach((service) => {
      const preset = SUBSERVICE_PRESETS[getServiceKey(service.name)] || [];
      preset.forEach((item) => all.add(item));
    });

    return Array.from(all);
  }, [selectedServices]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("name");
    const phoneParam = params.get("phone");

    if (name) setShopName(name);
    if (phoneParam) setPhone(phoneParam);

    const loadServices = async () => {
      try {
        const res = await fetch(apiUrl("/services"), { cache: "no-store" });
        const data = await res.json();

        const normalizedMap = new Map<string, ServiceOption>();

        if (Array.isArray(data)) {
          data.forEach((entry) => {
            if (!entry?.name) return;
            const nameText = String(entry.name).trim();
            if (!nameText) return;
            normalizedMap.set(normalizeServiceName(nameText), {
              key: String(entry.id),
              id: String(entry.id),
              name: nameText,
            });
          });
        }

        REQUIRED_SERVICE_NAMES.forEach((nameText) => {
          const normalized = normalizeServiceName(nameText);
          if (normalizedMap.has(normalized)) {
            return;
          }

          normalizedMap.set(normalized, {
            key: `custom:${normalized}`,
            id: null,
            name: nameText,
          });
        });

        const mergedServices = Array.from(normalizedMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setServiceOptions(mergedServices);

        if (mergedServices.length > 0) {
          setSelectedServiceKeys([mergedServices[0].key]);
        }
      } catch {
        setErrorMessage("Could not load service list.");
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    const count = Math.max(0, Math.min(25, Number(servicemanCount) || 0));
    setServicemen((current) => {
      if (current.length === count) {
        return current;
      }

      if (current.length > count) {
        return current.slice(0, count);
      }

      const next = [...current];
      while (next.length < count) {
        next.push(buildDefaultServiceman());
      }
      return next;
    });
  }, [servicemanCount]);

  const toggleServiceSelection = (serviceKey: string) => {
    setSelectedServiceKeys((current) => {
      if (current.includes(serviceKey)) {
        return current.filter((value) => value !== serviceKey);
      }

      return [...current, serviceKey];
    });
  };

  const toggleSubServiceSelection = (name: string) => {
    setSelectedSubServices((current) => {
      if (current.includes(name)) {
        return current.filter((value) => value !== name);
      }

      return [...current, name];
    });
  };

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
          const address = reverse.address || {};
          const fullAddress = reverse.display_name || "";
          const withCoordinates = `${fullAddress || "Detected location"} (Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)})`;

          setArea(withCoordinates);
          setCity(address.city || address.town || address.village || "");
          setPincode(address.postcode || "");
          if (!businessAddress.trim() && fullAddress) {
            setBusinessAddress(fullAddress);
          }
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

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const oversized = files.find((file) => file.size > 1.5 * 1024 * 1024);
    if (oversized) {
      setErrorMessage("Please upload images smaller than 1.5MB each.");
      return;
    }

    const imageData = await readFilesAsDataUrl(files.slice(0, 5)).catch(() => {
      setErrorMessage("Could not process uploaded images.");
      return [] as string[];
    });

    if (imageData.length > 0) {
      setShopImageUrls(imageData.filter(Boolean));
      setErrorMessage(null);
    }
  };

  const uploadServicemanImage = async (
    index: number,
    event: ChangeEvent<HTMLInputElement>,
    field: "photo" | "aadharPhoto"
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const file = files[0];
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Serviceman images must be smaller than 2MB.");
      return;
    }

    const [dataUrl] = await readFilesAsDataUrl([file]).catch(() => [""]);
    if (!dataUrl) {
      setErrorMessage("Could not process uploaded image.");
      return;
    }

    setServicemen((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: dataUrl };
      return next;
    });
    setErrorMessage(null);
  };

  const updateServicemanField = (index: number, field: keyof Omit<ServicemanForm, "photo" | "aadharPhoto">, value: string) => {
    setServicemen((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const saveVendorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedServices.length === 0) {
      setErrorMessage("Please select at least one service category.");
      return;
    }

    const selectedApiServiceIds = selectedServices
      .map((service) => service.id)
      .filter((id): id is string => Boolean(id));

    const primaryServiceId = selectedApiServiceIds[0] || null;

    const otherSubServices = otherSubServicesText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const parsedSubServices = Array.from(new Set([...selectedSubServices, ...otherSubServices]));

    const normalizedServicemen = servicemen
      .map((person) => ({
        name: person.name.trim(),
        phone: person.phone.trim(),
        aadharNumber: person.aadharNumber.trim(),
        serviceCategory: person.serviceCategory.trim(),
        photo: person.photo,
        aadharPhoto: person.aadharPhoto,
      }))
      .filter((person) => person.name || person.phone || person.aadharNumber || person.serviceCategory || person.photo || person.aadharPhoto);

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
      service_id: primaryServiceId,
      service_ids: selectedApiServiceIds,
      selected_service_names: selectedServices.map((service) => service.name),
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
      servicemen_count: Number(servicemanCount) || 0,
      servicemen_details: normalizedServicemen,
    };

    let { error } = await supabase
      .from("vendors")
      .upsert(payload as never, { onConflict: "auth_user_id" });

    if (error) {
      const basePayload = {
        auth_user_id: user.id,
        name: shopName,
        phone,
        service_id: primaryServiceId,
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

          <label className="auth-label">Service Categories (select multiple)</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.55rem", marginBottom: "0.95rem" }}>
            {serviceOptions.map((service) => {
              const selected = selectedServiceKeys.includes(service.key);
              return (
                <button
                  key={service.key}
                  type="button"
                  onClick={() => toggleServiceSelection(service.key)}
                  style={{
                    border: selected ? "1px solid #7a6a00" : "1px solid #d5dbe4",
                    background: selected ? "rgba(122,106,0,0.08)" : "#fff",
                    color: "#1f2937",
                    borderRadius: 12,
                    minHeight: 42,
                    fontSize: "0.83rem",
                    fontWeight: 700,
                    textAlign: "left",
                    padding: "0.48rem 0.58rem",
                  }}
                >
                  {service.name}
                </button>
              );
            })}
          </div>

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

          <label className="auth-label">Sub-services offered (MCQ)</label>
          {subServiceMcqOptions.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.55rem", marginBottom: "0.65rem" }}>
              {subServiceMcqOptions.map((option) => {
                const selected = selectedSubServices.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleSubServiceSelection(option)}
                    style={{
                      border: selected ? "1px solid #1d4ed8" : "1px solid #d5dbe4",
                      background: selected ? "rgba(29,78,216,0.08)" : "#fff",
                      borderRadius: 12,
                      padding: "0.5rem 0.58rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      textAlign: "left",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: "0 0 0.55rem", fontSize: "0.82rem", color: "#667085" }}>
              No predefined sub-services required for selected categories.
            </p>
          )}

          <label className="auth-label">Others (comma separated)</label>
          <input
            value={otherSubServicesText}
            onChange={(e) => setOtherSubServicesText(e.target.value)}
            placeholder="Custom sub-service 1, Custom sub-service 2"
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">No. of servicemen</label>
          <input
            type="number"
            min={0}
            max={25}
            value={servicemanCount}
            onChange={(e) => setServicemanCount(e.target.value)}
            className="auth-input auth-input--spaced"
          />

          {servicemen.map((person, index) => (
            <div key={`serviceman-${index}`} style={{ border: "1px solid #e4e7ec", borderRadius: 12, padding: "0.7rem", marginBottom: "0.7rem", background: "#fff" }}>
              <p style={{ margin: "0 0 0.45rem", fontWeight: 800, fontSize: "0.84rem", color: "#1f2937" }}>
                Serviceman {index + 1}
              </p>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <input
                  value={person.name}
                  onChange={(e) => updateServicemanField(index, "name", e.target.value)}
                  placeholder="Name"
                  className="auth-input"
                />
                <input
                  value={person.phone}
                  onChange={(e) => updateServicemanField(index, "phone", e.target.value)}
                  placeholder="Phone number"
                  className="auth-input"
                />
                <input
                  value={person.aadharNumber}
                  onChange={(e) => updateServicemanField(index, "aadharNumber", e.target.value)}
                  placeholder="Aadhar number"
                  className="auth-input"
                />
                <select
                  value={person.serviceCategory}
                  onChange={(e) => updateServicemanField(index, "serviceCategory", e.target.value)}
                  className="auth-select"
                >
                  <option value="">Select service category</option>
                  {selectedServices.map((service) => (
                    <option key={`person-${index}-${service.key}`} value={service.name}>{service.name}</option>
                  ))}
                </select>

                <label className="auth-label" style={{ marginBottom: 0 }}>Serviceman photo</label>
                <input type="file" accept="image/*" onChange={(e) => void uploadServicemanImage(index, e, "photo")} className="auth-input" />
                {person.photo ? <img src={person.photo} alt={`Serviceman ${index + 1}`} style={{ width: 84, height: 84, borderRadius: 10, objectFit: "cover", border: "1px solid #dfe3ea" }} /> : null}

                <label className="auth-label" style={{ marginBottom: 0 }}>Aadhar card photo</label>
                <input type="file" accept="image/*" onChange={(e) => void uploadServicemanImage(index, e, "aadharPhoto")} className="auth-input" />
                {person.aadharPhoto ? <img src={person.aadharPhoto} alt={`Aadhar ${index + 1}`} style={{ width: 120, height: 84, borderRadius: 10, objectFit: "cover", border: "1px solid #dfe3ea" }} /> : null}
              </div>
            </div>
          ))}

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
