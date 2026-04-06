"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { detectUserLocation } from "@/lib/location";

type Service = {
  id: string;
  name: string;
  sub_services?: unknown;
};

type ServiceOption = {
  key: string;
  id: string | null;
  name: string;
  subServices: string[];
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
  "Refrigerator Repair",
  "Geyser Service",
  "RO Service",
  "Microwave Repair",
  "Heater Repair",
  "Cooler Repair",
];

const SUBSERVICE_PRESETS: Record<string, string[]> = {
  ac: ["Foam jet service", "AC checkup", "AC installation", "AC uninstallation"],
  washing_machine: ["Semi automatic machine repair", "Automatic top load repair", "Automatic front load repair"],
  geyser: ["Install", "Uninstall", "Repair"],
};

const normalizeServiceName = (value: string) => value.trim().toLowerCase();

const isACServiceName = (normalizedName: string) => {
  return /\bac\b/.test(normalizedName)
    || normalizedName.includes("air conditioner")
    || normalizedName.includes("air conditioning");
};

const getServiceKey = (serviceName: string) => {
  const normalized = normalizeServiceName(serviceName);

  if (normalized.includes("washing")) return "washing_machine";
  if (isACServiceName(normalized)) return "ac";
  if (normalized.includes("geyser")) return "geyser";
  if (normalized.includes("chimney")) return "chimney";
  if (normalized.includes("refrigerator") || normalized.includes("fridge")) return "refrigerator";
  if (normalized.includes("ro") || normalized.includes("purifier")) return "ro";
  if (normalized.includes("microwave")) return "microwave";
  if (normalized.includes("heater")) return "heater";
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

const isSchemaColumnCompatibilityError = (error: { message?: string } | null | undefined) => {
  const message = String(error?.message || "").toLowerCase();
  if (!message) {
    return false;
  }

  return (
    (message.includes("column") && message.includes("does not exist")) ||
    message.includes("schema cache") ||
    message.includes("could not find the")
  );
};

const REQUIRED_VENDOR_PROFILE_COLUMNS = new Set<string>([
  "about_shop",
  "shop_image_urls",
  "service_ids",
  "selected_service_names",
  "sub_services",
  "servicemen_count",
  "servicemen_details",
]);

const extractMissingColumnFromSchemaError = (error: { message?: string } | null | undefined) => {
  const message = String(error?.message || "");
  if (!message) {
    return "";
  }

  const couldNotFindMatch = message.match(/could not find the ['\"]([^'\"]+)['\"] column/i);
  if (couldNotFindMatch?.[1]) {
    return couldNotFindMatch[1].trim();
  }

  const columnDoesNotExistMatch = message.match(/column ['\"]?([^'\"\s]+)['\"]? .* does not exist/i);
  if (columnDoesNotExistMatch?.[1]) {
    return columnDoesNotExistMatch[1].trim();
  }

  return "";
};

const upsertVendorWithSchemaCompatibility = async (payload: Record<string, unknown>) => {
  const nextPayload = { ...payload };
  let lastError: { message?: string } | null = null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { error } = await supabase
      .from("vendors")
      .upsert(nextPayload as never, { onConflict: "auth_user_id" });

    if (!error) {
      return null;
    }

    lastError = error;

    if (!isSchemaColumnCompatibilityError(error)) {
      return error;
    }

    const missingColumn = extractMissingColumnFromSchemaError(error);
    if (!missingColumn || missingColumn === "auth_user_id" || !(missingColumn in nextPayload)) {
      return error;
    }

    if (REQUIRED_VENDOR_PROFILE_COLUMNS.has(missingColumn)) {
      return {
        message: `Database is missing required column '${missingColumn}'. Run backend/sql/add_vendor_profile_fields.sql in Supabase SQL editor, then save again.`,
      };
    }

    delete nextPayload[missingColumn];
  }

  return lastError;
};

const parseServiceSubservices = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return normalized.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const getEffectiveServiceSubServices = (serviceName: string, serviceSubServices: string[]) => {
  const preset = SUBSERVICE_PRESETS[getServiceKey(serviceName)] || [];
  return Array.from(
    new Set([...serviceSubServices, ...preset].map((item) => String(item || "").trim()).filter(Boolean))
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
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [selectedServiceKeys, setSelectedServiceKeys] = useState<string[]>([]);
  const [selectedSubServicesByService, setSelectedSubServicesByService] = useState<Record<string, string[]>>({});
  const [subServicePriceMap, setSubServicePriceMap] = useState<Record<string, string>>({});
  const [customSubServiceDrafts, setCustomSubServiceDrafts] = useState<Record<string, { name: string; price: string }>>({});
  const [shopImageUrls, setShopImageUrls] = useState<string[]>([]);
  const [servicemanCount, setServicemanCount] = useState("1");
  const [servicemen, setServicemen] = useState<ServicemanForm[]>([buildDefaultServiceman()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const selectedServices = useMemo(
    () => serviceOptions.filter((service) => selectedServiceKeys.includes(service.key)),
    [serviceOptions, selectedServiceKeys]
  );

  const subServiceOptionsByService = useMemo(() => {
    return selectedServices.reduce<Record<string, string[]>>((acc, service) => {
      acc[service.key] = getEffectiveServiceSubServices(service.name, service.subServices);
      return acc;
    }, {});
  }, [selectedServices]);

  const getSubServicePriceKey = (serviceKey: string, name: string) => `${serviceKey}::${normalizeServiceName(name)}`;

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
            const entrySubServices = parseServiceSubservices(entry.sub_services);
            normalizedMap.set(normalizeServiceName(nameText), {
              key: String(entry.id),
              id: String(entry.id),
              name: nameText,
              subServices: entrySubServices,
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
            subServices: SUBSERVICE_PRESETS[getServiceKey(nameText)] || [],
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

  const toggleSubServiceSelection = (serviceKey: string, name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    setSelectedSubServicesByService((current) => {
      const existing = current[serviceKey] || [];
      const exists = existing.some((value) => normalizeServiceName(value) === normalizeServiceName(normalizedName));

      if (exists) {
        const nextList = existing.filter((value) => normalizeServiceName(value) !== normalizeServiceName(normalizedName));
        setSubServicePriceMap((priceState) => {
          const nextPriceState = { ...priceState };
          delete nextPriceState[getSubServicePriceKey(serviceKey, normalizedName)];
          return nextPriceState;
        });

        return {
          ...current,
          [serviceKey]: nextList,
        };
      }

      return {
        ...current,
        [serviceKey]: [...existing, normalizedName],
      };
    });
  };

  const setSubServicePrice = (serviceKey: string, name: string, price: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    setSubServicePriceMap((current) => ({
      ...current,
      [getSubServicePriceKey(serviceKey, normalizedName)]: price,
    }));
  };

  const updateCustomSubServiceDraft = (serviceKey: string, field: "name" | "price", value: string) => {
    setCustomSubServiceDrafts((current) => {
      const existing = current[serviceKey] || { name: "", price: "" };
      return {
        ...current,
        [serviceKey]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const addCustomSubService = (serviceKey: string) => {
    const existingDraft = customSubServiceDrafts[serviceKey] || { name: "", price: "" };
    const normalizedName = existingDraft.name.trim();
    if (!normalizedName) {
      return;
    }

    setSelectedSubServicesByService((current) => {
      const existing = current[serviceKey] || [];
      if (existing.some((value) => normalizeServiceName(value) === normalizeServiceName(normalizedName))) {
        return current;
      }

      return {
        ...current,
        [serviceKey]: [...existing, normalizedName],
      };
    });

    if (existingDraft.price.trim()) {
      setSubServicePrice(serviceKey, normalizedName, existingDraft.price.trim());
    }

    setCustomSubServiceDrafts((current) => ({
      ...current,
      [serviceKey]: { name: "", price: "" },
    }));
  };

  const removeSelectedSubService = (serviceKey: string, name: string) => {
    const normalizedName = name.trim();

    setSelectedSubServicesByService((current) => {
      const existing = current[serviceKey] || [];
      return {
        ...current,
        [serviceKey]: existing.filter((value) => normalizeServiceName(value) !== normalizeServiceName(normalizedName)),
      };
    });

    setSubServicePriceMap((current) => {
      const next = { ...current };
      delete next[getSubServicePriceKey(serviceKey, normalizedName)];
      return next;
    });
  };

  const useCurrentLocation = () => {
    setErrorMessage(null);
    setLocationMessage(null);
    setIsGettingLocation(true);

    detectUserLocation()
      .then((detected) => {
        const withCoordinates = `${detected.fullAddress || "Detected location"} (Lat ${detected.lat.toFixed(6)}, Lng ${detected.lng.toFixed(6)})`;
        setArea(withCoordinates);
        setCity(detected.city || "");
        setPincode(detected.postcode || "");

        if (!businessAddress.trim() && detected.fullAddress) {
          setBusinessAddress(detected.fullAddress);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message.trim()) {
          setLocationMessage(error.message);
        } else {
          setLocationMessage("Unable to detect location. You can enter area manually.");
        }
      })
      .finally(() => {
        setIsGettingLocation(false);
      });
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

    const flattenedSubServices = selectedServices.flatMap((service) => {
      const selectedForService = selectedSubServicesByService[service.key] || [];
      return selectedForService
        .map((name) => ({ serviceKey: service.key, name: name.trim() }))
        .filter((entry) => Boolean(entry.name));
    });

    const uniqueSubServicesByName = new Map<string, { serviceKey: string; name: string }>();
    flattenedSubServices.forEach((entry) => {
      const key = normalizeServiceName(entry.name);
      if (!uniqueSubServicesByName.has(key)) {
        uniqueSubServicesByName.set(key, entry);
      }
    });

    const parsedSubServices = Array.from(uniqueSubServicesByName.values()).map((entry) => entry.name);
    const pricedSubServices = Array.from(uniqueSubServicesByName.values()).map((entry) => {
      const price = Number(subServicePriceMap[getSubServicePriceKey(entry.serviceKey, entry.name)]);
      if (Number.isFinite(price) && price > 0) {
        return `${entry.name}::${Math.round(price)}`;
      }

      return entry.name;
    });
    const subServicePricePayload = Array.from(uniqueSubServicesByName.values()).reduce<Record<string, number>>((acc, entry) => {
      const price = Number(subServicePriceMap[getSubServicePriceKey(entry.serviceKey, entry.name)]);
      if (Number.isFinite(price) && price > 0) {
        acc[entry.name] = Math.round(price);
      }
      return acc;
    }, {});

    const normalizedServicemen = servicemen
      .map((person, index) => ({
        id: String((person as Record<string, unknown>).id || `serviceman-${index + 1}`),
        name: person.name.trim(),
        phone: person.phone.trim(),
        aadharNumber: person.aadharNumber.trim(),
        serviceCategory: person.serviceCategory.trim(),
        photo: person.photo,
        aadharPhoto: person.aadharPhoto,
      }))
      .filter((person) => person.name || person.phone || person.aadharNumber || person.serviceCategory || person.photo || person.aadharPhoto)
      .map((person, index) => ({
        ...person,
        name: person.name || `Serviceman ${index + 1}`,
      }));

    const normalizedServicemanCount = Math.max(Number(servicemanCount) || 0, normalizedServicemen.length);

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
      is_active: false,
      approval_status: "pending",
      owner_name: ownerName || null,
      business_address: businessAddress || null,
      city: city || null,
      pincode: pincode || null,
      gst_number: gstNumber || null,
      about_shop: aboutShop || null,
      open_time: openTime || null,
      close_time: closeTime || null,
      service_radius_km: Number(serviceRadiusKm) || null,
      sub_service_prices: subServicePricePayload,
      sub_services: pricedSubServices,
      shop_image_urls: shopImageUrls,
      servicemen_count: normalizedServicemanCount,
      serviceman_count: normalizedServicemanCount,
      servicemen_details: normalizedServicemen,
      serviceman_details: normalizedServicemen,
    };

    const error = await upsertVendorWithSchemaCompatibility(payload as Record<string, unknown>);

    if (error) {
      setErrorMessage(error.message || "Could not save vendor profile.");
      setIsSubmitting(false);
      return;
    }

    router.push("/vendor/dashboard?pendingApproval=true");
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
            placeholder="Ex: Krishna Home Services"
            required
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">
            Phone
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number (XXXXXXXXXX)"
            required
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">
            Owner Name
          </label>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Ex: Krishna Singhal"
            required
            className="auth-input auth-input--spaced"
          />

          <label className="auth-label">Service Categories (select multiple)</label>
          <div style={{ display: "grid", gap: "0.55rem", marginBottom: "0.95rem" }}>
            {serviceOptions.map((service) => {
              const selected = selectedServiceKeys.includes(service.key);
              return (
                <div
                  key={service.key}
                  style={{
                    border: selected ? "1px solid #7a6a00" : "1px solid #d5dbe4",
                    background: selected ? "rgba(122,106,0,0.08)" : "#fff",
                    color: "#1f2937",
                    borderRadius: 12,
                    padding: "0.56rem 0.62rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.65rem" }}>
                    <strong style={{ fontSize: "0.86rem" }}>{service.name}</strong>
                    <button
                      type="button"
                      onClick={() => toggleServiceSelection(service.key)}
                      className="auth-secondary-btn"
                      style={{
                        width: "auto",
                        padding: "0.35rem 0.68rem",
                        borderColor: selected ? "#f5c2c7" : "#b7e4c7",
                        background: selected ? "#fee2e2" : "#dcfce7",
                        color: selected ? "#b91c1c" : "#166534",
                      }}
                    >
                      {selected ? "Remove" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <label className="auth-label">Sub-services by selected service</label>
          {selectedServices.length > 0 ? (
            <div style={{ display: "grid", gap: "0.8rem", marginBottom: "0.85rem" }}>
              {selectedServices.map((service) => {
                const serviceSubOptions = subServiceOptionsByService[service.key] || [];
                const selectedForService = selectedSubServicesByService[service.key] || [];
                const draft = customSubServiceDrafts[service.key] || { name: "", price: "" };

                return (
                  <div key={`subservice-${service.key}`} style={{ border: "1px solid #e4e7ec", borderRadius: 12, padding: "0.7rem", background: "#fff" }}>
                    <p style={{ margin: "0 0 0.45rem", fontWeight: 800, fontSize: "0.86rem", color: "#1f2937" }}>
                      {service.name}
                    </p>

                    {serviceSubOptions.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.5rem", marginBottom: "0.6rem" }}>
                        {serviceSubOptions.map((option) => {
                          const selected = selectedForService.some((value) => normalizeServiceName(value) === normalizeServiceName(option));
                          return (
                            <button
                              key={`${service.key}-${option}`}
                              type="button"
                              onClick={() => toggleSubServiceSelection(service.key, option)}
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
                        No predefined sub-services found. Add custom sub-services below.
                      </p>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "0.45rem", marginBottom: "0.6rem" }}>
                      <input
                        value={draft.name}
                        onChange={(e) => updateCustomSubServiceDraft(service.key, "name", e.target.value)}
                        placeholder="Ex: AC gas refill"
                        className="auth-input"
                      />
                      <input
                        type="number"
                        min={0}
                        value={draft.price}
                        onChange={(e) => updateCustomSubServiceDraft(service.key, "price", e.target.value)}
                        placeholder="Ex: 499"
                        className="auth-input"
                      />
                      <button
                        type="button"
                        onClick={() => addCustomSubService(service.key)}
                        className="auth-secondary-btn"
                        style={{ width: "auto", padding: "0.54rem 0.78rem" }}
                      >
                        Add
                      </button>
                    </div>

                    {selectedForService.length > 0 ? (
                      <div style={{ display: "grid", gap: "0.45rem" }}>
                        {selectedForService.map((name) => (
                          <div key={`${service.key}-selected-${name}`} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr auto", gap: "0.5rem", alignItems: "center" }}>
                            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1f2937" }}>{name}</div>
                            <input
                              type="number"
                              min={0}
                              value={subServicePriceMap[getSubServicePriceKey(service.key, name)] || ""}
                              onChange={(e) => setSubServicePrice(service.key, name, e.target.value)}
                              placeholder="Ex: 399"
                              className="auth-input"
                            />
                            <button
                              type="button"
                              onClick={() => removeSelectedSubService(service.key, name)}
                              className="auth-secondary-btn"
                              style={{ width: "auto", padding: "0.45rem 0.72rem" }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: "0", fontSize: "0.8rem", color: "#667085" }}>
                        No sub-service selected for {service.name}.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "#667085" }}>
              Select at least one service category to configure sub-services.
            </p>
          )}

          <label className="auth-label">
            Experience (years)
          </label>
          <input
            type="number"
            min={0}
            max={60}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Ex: 5"
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

          {locationMessage ? (
            <p style={{ color: "#475467", marginTop: "0.55rem", fontSize: "0.84rem" }}>
              {locationMessage}
            </p>
          ) : null}

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
                placeholder="Ex: Lucknow"
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
                placeholder="Ex: 226001"
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
                placeholder="Ex: 10"
                required
                className="auth-input auth-input--spaced"
              />
            </div>
          </div>

          <label className="auth-label">No. of servicemen</label>
          <input
            type="number"
            min={0}
            max={25}
            value={servicemanCount}
            onChange={(e) => setServicemanCount(e.target.value)}
            placeholder="Ex: 3"
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
                  placeholder="Serviceman full name"
                  className="auth-input"
                />
                <input
                  value={person.phone}
                  onChange={(e) => updateServicemanField(index, "phone", e.target.value)}
                  placeholder="Serviceman phone (XXXXXXXXXX)"
                  className="auth-input"
                />
                <input
                  value={person.aadharNumber}
                  onChange={(e) => updateServicemanField(index, "aadharNumber", e.target.value)}
                  placeholder="Aadhaar number (XXXX XXXX XXXX)"
                  className="auth-input"
                />
                <select
                  value={person.serviceCategory}
                  onChange={(e) => updateServicemanField(index, "serviceCategory", e.target.value)}
                  className="auth-select"
                >
                  <option value="">Select service category handled by this serviceman</option>
                  {selectedServices.map((service) => (
                    <option key={`person-${index}-${service.key}`} value={service.name}>{service.name}</option>
                  ))}
                </select>

                <label className="auth-label" style={{ marginBottom: 0 }}>Serviceman photo</label>
                <input type="file" accept="image/*" onChange={(e) => void uploadServicemanImage(index, e, "photo")} className="auth-input" />
                {person.photo ? <Image unoptimized src={person.photo} alt={`Serviceman ${index + 1}`} width={84} height={84} style={{ borderRadius: 10, objectFit: "cover", border: "1px solid #dfe3ea" }} /> : null}

                <label className="auth-label" style={{ marginBottom: 0 }}>Aadhar card photo</label>
                <input type="file" accept="image/*" onChange={(e) => void uploadServicemanImage(index, e, "aadharPhoto")} className="auth-input" />
                {person.aadharPhoto ? <Image unoptimized src={person.aadharPhoto} alt={`Aadhar ${index + 1}`} width={120} height={84} style={{ borderRadius: 10, objectFit: "cover", border: "1px solid #dfe3ea" }} /> : null}
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
                <Image
                  unoptimized
                  key={`${index}-${image.slice(0, 24)}`}
                  src={image}
                  alt={`Shop preview ${index + 1}`}
                  width={200}
                  height={72}
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
            <p className="auth-feedback auth-feedback--error">{errorMessage}</p>
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
