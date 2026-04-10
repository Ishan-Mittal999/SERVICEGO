"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";
import { initializeShopCart, readShopCart } from "@/lib/shop-cart";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import {
  distanceInKm,
  geocodeArea,
  getVendorLocation,
  parseCoordinatesFromArea,
  readUserLocation,
  saveVendorLocation,
  type UserLocation,
} from "@/lib/location";

type Service = {
  id: string | number;
  name: string;
  description?: string;
  icon?: string;
  sub_services?: unknown;
};

type SubserviceItem = {
  name: string;
  included?: string[] | string;
  notIncluded?: string[] | string;
  note?: string;
};

type PredefinedSubservice = string | SubserviceItem;

type Vendor = {
  id: string | number;
  name?: string;
  phone?: string;
  service_id?: string | number;
  service_ids?: Array<string | number> | unknown;
  selected_service_names?: string[] | unknown;
  area?: string;
  latitude?: number;
  longitude?: number;
  experience?: number;
  is_active?: boolean;
  service_base_price?: number;
  minimum_order_value?: number;
  sub_service_prices?: unknown;
  rating_average?: number | null;
  rating_count?: number | null;
};

type PricedSubService = {
  name: string;
  price: number | null;
};

type ShopsCachePayload = {
  services: Service[];
  vendors: Vendor[];
};

const SHOPS_CACHE_TTL_MS = 5 * 60 * 1000;

const SHOP_PREDEFINED_SUBSERVICE_MAP: Record<string, PredefinedSubservice[]> = {
  washing_machine: [
    {
      name: "Semi-Auto WM Check-up",
      note: "Check-up fee waived if you choose repair through ServiceGo immediately",
      included: [
        "Dual-Motor Performance Test",
        "Mechanical Timer Audit",
        "Belt & Pulley Tension Check",
        "Capacitor Health Check",
        "Drainage System Inspection",
        "Wiring & Rodent Damage Scan",
      ],
      notIncluded: [
        "Actual Repair Work",
        "Spare Parts Cost",
        "Washing Machine Cleaning",
        "Lifting/Moving Machine",
        "Rat-Proofing Mesh",
      ],
    },
    {
      name: "Top Load WM Check-up",
      note: "Top Load error codes (E1, dE, PE) decoded and explained",
      included: [
        "Digital Controller Audit",
        "Sensor Calibration Check",
        "Inlet & Drain Valve Test",
        "Drum Balance & Suspension Scan",
        "Motor & Capacitor Health",
        "Agitator/Pulsator Inspection",
      ],
      notIncluded: [
        "Repair or Part Replacement",
        "PCB Repair/Recoding",
        "Internal Tub Descaling",
        "Rat-Mesh Installation",
        "Plumbing/Tap Fixes",
      ],
    },
    {
      name: "Front Load WM Check-up",
      note: "Expert verifies machine leveling to prevent future vibration damage",
      included: [
        "Error Code Diagnosis",
        "Inverter Motor & Carbon Brush Check",
        "Door Bellow Inspection",
        "Heating Element & NTC Test",
        "Suspension & Bearing Audit",
        "Drain Pump & Filter Scan",
      ],
      notIncluded: [
        "Actual Repair or Part Cost",
        "Drum/Bearing Replacement",
        "PCB Motherboard Repair",
        "Door Gasket Replacement",
        "Internal Descaling",
      ],
    },
    {
      name: "Top Load Normal Cleaning",
      note: "Single normal cleaning may not remove 100% crust if heavily scaled",
      included: [
        "Lint Filter Deep Clean",
        "Detergent Drawer Sanitization",
        "Pulsator Surface Cleaning",
        "Inner Drum Scrubbing",
        "Eco-Tub Wash Cycle",
        "Outer Body Wipe-down",
      ],
      notIncluded: [
        "Full Drum Dismantling",
        "Repair of Mechanical Parts",
        "Inlet/Drain Pipe Replacement",
        "Rat-Mesh Installation",
        "Major Descaling",
      ],
    },
    {
      name: "Top Load Deep Cleaning",
      note: "Takes 90-120 minutes. Ensure continuous water supply and floor drain",
      included: [
        "Full Drum Dismantling",
        "High-Pressure Jet Wash",
        "Pulsator Deep Scrub",
        "Tub-in-Tub Sanitization",
        "Drain Pump & Filter Clear-out",
        "Re-balancing & Calibration",
      ],
      notIncluded: [
        "Mechanical Repairs",
        "Replacement of Rusted Parts",
        "Inlet/Outlet Pipe Material",
        "Body Dent/Paint Repair",
        "Rat-Mesh Installation",
      ],
    },
    {
      name: "Front Load Normal Cleaning",
      note: "Does not involve pulling heavy drum out of machine",
      included: [
        "Rubber Gasket Sanitization",
        "Drain Pump Filter Clear-out",
        "Detergent Drawer Deep Clean",
        "Inner Drum Surface Polish",
        "High-Temp Descaling Cycle",
        "Glass Door & Panel Wipe",
      ],
      notIncluded: [
        "Full Drum Extraction",
        "Gasket/Seal Replacement",
        "Bearing or Motor Repair",
        "Inlet Water Filter Cleaning",
        "Plumbing/Drainage Fixes",
      ],
    },
    {
      name: "Front Load Deep Cleaning",
      note: "Takes 2-3 hours. Ensure dedicated workspace and water supply",
      included: [
        "Major Teardown Service",
        "Complete Drum Extraction",
        "High-Pressure Chemical Wash",
        "Bellow Deep Scrub",
        "Drain Pump & Manifold Cleaning",
        "Re-assembly & Leveling",
      ],
      notIncluded: [
        "Bearing or Spider Replacement",
        "Repair of Mechanical/Electronic Faults",
        "Gasket/Seal Replacement",
        "Body Rust/Paint Restoration",
        "Plumbing/Tap Fixes",
      ],
    },
  ],
};

const SHOP_CARD_BACKGROUNDS = [
  "linear-gradient(135deg, #f43f5e 0%, #ef4444 42%, #b91c1c 100%)",
  "linear-gradient(135deg, #fb7185 0%, #f97316 45%, #ea580c 100%)",
  "linear-gradient(135deg, #1d4ed8 0%, #06b6d4 48%, #0e7490 100%)",
  "linear-gradient(135deg, #16a34a 0%, #22c55e 45%, #15803d 100%)",
  "linear-gradient(135deg, #7c3aed 0%, #4f46e5 45%, #312e81 100%)",
];

const toCardVariantIndex = (vendorId: string | number) => {
  const normalized = String(vendorId);
  let total = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    total += normalized.charCodeAt(index);
  }

  return total % SHOP_CARD_BACKGROUNDS.length;
};

const getVendorRatingAverage = (vendor: Vendor) => {
  return typeof vendor.rating_average === "number" ? vendor.rating_average : null;
};

const getVendorRatingCount = (vendor: Vendor) => {
  return typeof vendor.rating_count === "number" ? vendor.rating_count : 0;
};

const toEtaMinutes = (distance?: number) => {
  if (typeof distance !== "number") {
    return "20-30 mins";
  }

  if (distance <= 2) {
    return "10-18 mins";
  }
  if (distance <= 5) {
    return "15-24 mins";
  }

  return "20-35 mins";
};

const toCardPrice = (experience?: number) => {
  if (typeof experience !== "number") {
    return 119;
  }

  return Math.max(99, Math.round(89 + experience * 3));
};

const parsePostgresArrayString = (raw: string): string[] => {
  if (!raw.startsWith("{") || !raw.endsWith("}")) {
    return [];
  }

  const body = raw.slice(1, -1);
  if (!body.trim()) {
    return [];
  }

  const items: string[] = [];
  let current = "";
  let inQuotes = false;
  let escaped = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      items.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items.filter(Boolean);
};

const normalizeEntry = (entry: unknown) => {
  const trimmed = String(entry || "").trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.includes("::")) {
    return String(trimmed.split("::")[0] || "").trim();
  }

  return trimmed;
};

const parseVendorListField = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeEntry(item))
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeEntry(item))
          .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
      }
    } catch {
      // Fallback to structured string formats.
    }

    const postgresArray = parsePostgresArrayString(normalized);
    if (postgresArray.length > 0) {
      return postgresArray
        .map((item) => normalizeEntry(item))
        .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
    }

    if (normalized.startsWith("data:image/")) {
      return [normalized];
    }

    return normalized
      .split(",")
      .map((item) => normalizeEntry(item))
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  return [];
};

const parsePositivePrice = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "").trim();
    if (!cleaned) {
      return null;
    }

    const numeric = Number(cleaned);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.round(numeric);
    }
  }

  return null;
};

const parseVendorSubservicePricing = (vendor: Vendor): PricedSubService[] => {
  const rawEntries = parseVendorListField((vendor as Record<string, unknown>).sub_services);
  const fallbackPriceMap = (vendor as Record<string, unknown>).sub_service_prices;

  // Build a map that ensures exact name matching to avoid collisions
  const exactPriceMap = new Map<string, number>();
  if (fallbackPriceMap && typeof fallbackPriceMap === "object" && !Array.isArray(fallbackPriceMap)) {
    Object.entries(fallbackPriceMap as Record<string, unknown>).forEach(([name, value]) => {
      const trimmedName = String(name || "").trim();
      const numericPrice = parsePositivePrice(value);
      if (trimmedName && numericPrice !== null) {
        // Use exact name as key first
        exactPriceMap.set(trimmedName, numericPrice);
      }
    });
  }

  const deduped = new Map<string, PricedSubService>();

  rawEntries.forEach((entry) => {
    const trimmedEntry = entry.trim();
    if (!trimmedEntry) {
      return;
    }

    let name = trimmedEntry;
    let parsedPrice: number | null = null;

    if (trimmedEntry.includes("::")) {
      const [rawName, rawPrice] = trimmedEntry.split("::");
      name = String(rawName || "").trim();
      parsedPrice = parsePositivePrice(rawPrice);
    }

    const normalizedName = normalizeShopText(name);
    if (!normalizedName) {
      return;
    }

    // Try exact match first, then fallback to normalized match
    let fallbackPrice = exactPriceMap.get(name) ?? null;
    if (fallbackPrice === null) {
      fallbackPrice = exactPriceMap.get(normalizedName) ?? null;
    }

    deduped.set(name, {
      name,
      price: parsedPrice ?? fallbackPrice,
    });
  });

  return Array.from(deduped.values());
};

const parseSubserviceArray = (value: unknown): string[] => {
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
        return parsed
          .map((item) => normalizeEntry(item))
          .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
      }
    } catch {
      // Fallback to comma-separated values.
    }

    const postgresArray = parsePostgresArrayString(normalized);
    if (postgresArray.length > 0) {
      return postgresArray
        .map((item) => normalizeEntry(item))
        .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
    }

    return normalized
      .split(",")
      .map((item) => normalizeEntry(item))
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  return [];
};

const normalizeShopText = (value: string) => value.trim().toLowerCase();

const isACServiceName = (normalizedName: string) => {
  return /\bac\b/.test(normalizedName)
    || normalizedName.includes("air conditioner")
    || normalizedName.includes("air conditioning");
};

const getShopServiceKey = (serviceName: string) => {
  const normalized = normalizeShopText(serviceName);

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

const normalizeSubserviceMatchKey = (value: string) =>
  normalizeShopText(value)
    .replace(/\bchimeny\b/g, "chimney")
    .replace(/\buninstall(?:ation|ing|ed)?\b/g, " uninstall ")
    .replace(/\binstall(?:ation|ing|ed)?\b/g, " install ")
    .replace(/check\s*-\s*up/g, "checkup")
    .replace(/\bwm\b/g, "washing machine")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(ac|air conditioner|washing machine|machine)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const detectSubserviceFamily = (value: string): string | null => {
  const normalized = normalizeShopText(value).replace(/\bchimeny\b/g, "chimney");

  if (/\bac\b|air conditioner|air conditioning/.test(normalized)) return "ac";
  if (normalized.includes("chimney")) return "chimney";
  if (normalized.includes("geyser")) return "geyser";
  if (normalized.includes("washing machine") || normalized.includes("washing")) return "washing_machine";
  if (normalized.includes("fridge") || normalized.includes("refrigerator")) return "refrigerator";
  if (normalized.includes("ro") || normalized.includes("purifier")) return "ro";
  if (normalized.includes("microwave")) return "microwave";

  return null;
};

const isSubserviceNameMatch = (selectedName: string, vendorName: string, serviceContextName?: string) => {
  const selectedFamily = detectSubserviceFamily(selectedName) || detectSubserviceFamily(serviceContextName || "");
  const vendorFamily = detectSubserviceFamily(vendorName);

  // If both subservice names identify a service family, do not allow cross-service matching.
  if (selectedFamily && vendorFamily && selectedFamily !== vendorFamily) {
    return false;
  }

  const normalizedSelected = normalizeSubserviceMatchKey(selectedName);
  const normalizedVendor = normalizeSubserviceMatchKey(vendorName);

  if (!normalizedSelected || !normalizedVendor) {
    return false;
  }

  if (normalizedSelected === normalizedVendor) {
    return true;
  }

  const selectedTokens = normalizedSelected.split(" ").filter(Boolean);
  const vendorTokens = normalizedVendor.split(" ").filter(Boolean);
  const selectedTokenSet = new Set(selectedTokens);
  const vendorTokenSet = new Set(vendorTokens);

  const selectedHasUninstall = selectedTokenSet.has("uninstall");
  const vendorHasUninstall = vendorTokenSet.has("uninstall");
  if (selectedHasUninstall !== vendorHasUninstall) {
    return false;
  }

  const selectedHasInstall = selectedTokenSet.has("install");
  const vendorHasInstall = vendorTokenSet.has("install");
  if (selectedHasInstall !== vendorHasInstall) {
    return false;
  }

  const selectedCoveredByVendor = selectedTokens.every((token) => vendorTokenSet.has(token));
  return selectedCoveredByVendor;
};

const vendorHasService = (vendor: Vendor, service: Service | null) => {
  if (!service) {
    return true;
  }

  const targetServiceId = String(service.id).trim();
  const targetServiceName = normalizeShopText(service.name || "");
  const targetServiceKey = getShopServiceKey(service.name || "");

  if (String(vendor.service_id || "").trim() === targetServiceId) {
    return true;
  }

  const vendorServiceIds = parseVendorListField((vendor as Record<string, unknown>).service_ids);
  if (vendorServiceIds.some((id) => String(id || "").trim() === targetServiceId)) {
    return true;
  }

  const vendorServiceNames = parseVendorListField((vendor as Record<string, unknown>).selected_service_names);
  if (vendorServiceNames.some((name) => normalizeShopText(name) === targetServiceName)) {
    return true;
  }

  if (targetServiceKey) {
    const vendorServiceKeys = vendorServiceNames.map((name) => getShopServiceKey(name));
    if (vendorServiceKeys.some((key) => key === targetServiceKey)) {
      return true;
    }
  }

  return false;
};

const getShopServiceScore = (service: Service, query: string) => {
  if (!query) {
    return 0;
  }

  const name = normalizeShopText(service.name || "");
  const description = normalizeShopText(service.description || "");
  const combined = `${name} ${description}`;

  let score = 0;
  if (name === query) score += 100;
  if (name.startsWith(query)) score += 70;
  if (name.includes(query)) score += 50;
  if (description.includes(query)) score += 20;
  if (query.split(/\s+/).every((word) => combined.includes(word))) score += 15;

  return score;
};

function ShopsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [vendorLocations, setVendorLocations] = useState<Record<string, { lat: number; lng: number }>>({});

  const serviceId = searchParams.get("serviceId") || "";
  const serviceName = (searchParams.get("serviceName") || "").trim();
  const serviceQuery = normalizeShopText(searchParams.get("serviceQuery") || "");
  const selectedSubServiceLabel = (searchParams.get("subService") || "").trim();
  const selectedSubService = normalizeShopText(selectedSubServiceLabel);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [serviceId, serviceName, serviceQuery, selectedSubServiceLabel]);

  useEffect(() => {
    const syncCartCount = () => {
      const existingCart = readShopCart();
      const count = existingCart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
      setCartCount(count);
    };

    const storedLocation = readUserLocation();
    if (storedLocation) {
      setUserLocation(storedLocation);
    }

    syncCartCount();

    const onCartUpdated = () => {
      syncCartCount();
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "servicego-shop-cart") {
        syncCartCount();
      }
    };

    window.addEventListener("servicego-cart-updated", onCartUpdated as EventListener);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", syncCartCount);

    return () => {
      window.removeEventListener("servicego-cart-updated", onCartUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", syncCartCount);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const cacheKey = `shops:${serviceId}:${serviceName}:${serviceQuery}`;
      const cachedPayload = readClientCache<ShopsCachePayload>(cacheKey, SHOPS_CACHE_TTL_MS);
      const hasCachedPayload = Boolean(cachedPayload);

      if (hasCachedPayload && cachedPayload) {
        setServices(cachedPayload.services);
        setVendors(cachedPayload.vendors);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        if (serviceId) {
          const vendorsUrl = apiUrl(
            `/vendors?serviceId=${encodeURIComponent(serviceId)}&serviceName=${encodeURIComponent(serviceName)}&limit=100`
          );

          const [vendorsResponse, serviceResponse] = await Promise.all([
            fetch(vendorsUrl, { cache: "force-cache" }),
            fetch(apiUrl(`/services/${encodeURIComponent(serviceId)}`), { cache: "force-cache" }),
          ]);

          if (!vendorsResponse.ok) {
            throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
          }

          if (!serviceResponse.ok) {
            throw new Error(`Service API failed with ${serviceResponse.status}`);
          }

          const [vendorsDataRaw, serviceDataRaw] = await Promise.all([
            vendorsResponse.json(),
            serviceResponse.json(),
          ]);

          const serviceData = serviceDataRaw.data || null;
          let vendorsData = vendorsDataRaw.data || (Array.isArray(vendorsDataRaw) ? vendorsDataRaw : []);

          if (!serviceName && vendorsData.length === 0 && serviceData?.name) {
            const fallbackVendorsResponse = await fetch(
              apiUrl(
                `/vendors?serviceId=${encodeURIComponent(serviceId)}&serviceName=${encodeURIComponent(
                  serviceData.name
                )}&limit=100`
              ),
              { cache: "force-cache" }
            );

            if (fallbackVendorsResponse.ok) {
              const fallbackVendorsDataRaw = await fallbackVendorsResponse.json();
              vendorsData = fallbackVendorsDataRaw.data || (Array.isArray(fallbackVendorsDataRaw) ? fallbackVendorsDataRaw : []);
            }
          }

          const serviceList = serviceData ? [serviceData] : [];

          setServices(serviceList);
          setVendors(vendorsData);
          setErrorMessage(null);
          writeClientCache(cacheKey, {
            services: serviceList,
            vendors: vendorsData,
          });
          return;
        }

        const servicesResponse = await fetch(apiUrl("/services?limit=100"), { cache: "force-cache" });

        if (!servicesResponse.ok) {
          throw new Error(`Services API failed with ${servicesResponse.status}`);
        }

        const servicesDataRaw = await servicesResponse.json();
        const servicesData = servicesDataRaw.data || (Array.isArray(servicesDataRaw) ? servicesDataRaw : []);

        const resolvedService = serviceQuery
          ? servicesData
            .map((service: Service) => ({ service, score: getShopServiceScore(service, serviceQuery) }))
            .sort((left: { service: Service; score: number }, right: { service: Service; score: number }) => right.score - left.score)[0]
          : null;

        const matchedService = resolvedService && resolvedService.score > 0 ? resolvedService.service : null;

        const vendorsUrl = matchedService
          ? apiUrl(
            `/vendors?serviceId=${encodeURIComponent(String(matchedService.id))}&serviceName=${encodeURIComponent(
              matchedService.name || ""
            )}&limit=100`
          )
          : apiUrl("/vendors?limit=100");

        const vendorsResponse = await fetch(vendorsUrl, { cache: "force-cache" });
        if (!vendorsResponse.ok) {
          throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
        }

        const vendorsDataRaw = await vendorsResponse.json();
        const vendorsData = vendorsDataRaw.data || (Array.isArray(vendorsDataRaw) ? vendorsDataRaw : []);

        const servicesForState = matchedService ? [matchedService] : servicesData;

        setServices(servicesForState);
        setVendors(vendorsData);
        setErrorMessage(null);
        writeClientCache(cacheKey, {
          services: servicesForState,
          vendors: vendorsData,
        });
      } catch (error) {
        console.error("Failed to load shops", error);
        if (!hasCachedPayload) {
          setErrorMessage("Unable to load shops right now. Please try again.");
        }
      } finally {
        if (!hasCachedPayload) {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [serviceId, serviceName, serviceQuery]);

  const selectedService = useMemo(() => {
    if (serviceId) {
      return services.find((item) => String(item.id) === String(serviceId)) ?? null;
    }

    if (!serviceQuery) {
      return null;
    }

    const best = services
      .map((service) => ({ service, score: getShopServiceScore(service, serviceQuery) }))
      .sort((left, right) => right.score - left.score)[0];

    return best && best.score > 0 ? best.service : null;
  }, [services, serviceId, serviceQuery]);

  const selectedSubserviceDetails = useMemo(() => {
    if (!selectedSubServiceLabel) {
      return null;
    }

    const serviceKey = getShopServiceKey(selectedService?.name || serviceName);
    const predefined = SHOP_PREDEFINED_SUBSERVICE_MAP[serviceKey] || [];
    const detailedEntries = predefined
      .map((item) => (typeof item === "string" ? null : item))
      .filter((item): item is SubserviceItem => Boolean(item));

    if (detailedEntries.length === 0) {
      return null;
    }

    return (
      detailedEntries.find((item) =>
        isSubserviceNameMatch(selectedSubServiceLabel, item.name, selectedService?.name || serviceName)
      ) || null
    );
  }, [selectedSubServiceLabel, selectedService, serviceName]);

  const vendorDistances = useMemo(() => {
    if (!userLocation) {
      return {} as Record<string, number>;
    }

    const distances: Record<string, number> = {};

    Object.entries(vendorLocations).forEach(([vendorId, coords]) => {
      distances[vendorId] = distanceInKm(
        { lat: userLocation.lat, lng: userLocation.lng },
        coords
      );
    });

    return distances;
  }, [userLocation, vendorLocations]);

  const filteredVendors = useMemo(() => {
    const serviceFiltered = selectedService
      ? vendors.filter((vendor) => vendorHasService(vendor, selectedService))
      : vendors;

    const safeServiceFiltered = selectedService && serviceFiltered.length === 0
      ? vendors
      : serviceFiltered;

    const subServiceFilteredStrict = selectedSubService
      ? safeServiceFiltered.filter((vendor) =>
          parseVendorListField((vendor as Record<string, unknown>).sub_services).some((item) =>
            isSubserviceNameMatch(
              selectedSubServiceLabel || selectedSubService,
              item,
              selectedService?.name || serviceName
            )
          )
        )
      : safeServiceFiltered;

    // If no vendor has explicit mapping for the chosen sub-service, keep service-level vendors visible.
    const subServiceFiltered =
      selectedSubService && subServiceFilteredStrict.length === 0
        ? safeServiceFiltered
        : subServiceFilteredStrict;

    return subServiceFiltered.sort((left, right) => {
      const leftInactive = left.is_active === false ? 1 : 0;
      const rightInactive = right.is_active === false ? 1 : 0;
      if (leftInactive !== rightInactive) {
        return leftInactive - rightInactive;
      }

      const leftRatingCount = getVendorRatingCount(left);
      const rightRatingCount = getVendorRatingCount(right);
      const leftHasRating = leftRatingCount > 0;
      const rightHasRating = rightRatingCount > 0;

      if (leftHasRating !== rightHasRating) {
        return leftHasRating ? -1 : 1;
      }

      const leftRatingAverage = getVendorRatingAverage(left) ?? 0;
      const rightRatingAverage = getVendorRatingAverage(right) ?? 0;

      if (leftRatingAverage !== rightRatingAverage) {
        return rightRatingAverage - leftRatingAverage;
      }

      if (leftRatingCount !== rightRatingCount) {
        return rightRatingCount - leftRatingCount;
      }

      const leftDistance = vendorDistances[String(left.id)] ?? Number.POSITIVE_INFINITY;
      const rightDistance = vendorDistances[String(right.id)] ?? Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    });
  }, [vendors, selectedService, selectedSubService, vendorDistances]);

  const visibleVendors = filteredVendors;

  const vendorSubserviceMap = useMemo(() => {
    const map: Record<string, PricedSubService[]> = {};
    vendors.forEach((vendor) => {
      map[String(vendor.id)] = parseVendorSubservicePricing(vendor);
    });
    return map;
  }, [vendors]);

  const getVendorFinalPrice = (vendor: Vendor) => {
    const parsedSubservices = vendorSubserviceMap[String(vendor.id)] || [];

    if (selectedSubService) {
      const match = parsedSubservices.find(
        (entry) =>
          isSubserviceNameMatch(
            selectedSubServiceLabel || selectedSubService,
            entry.name,
            selectedService?.name || serviceName
          )
      );

      if (match?.price) {
        return match.price;
      }
    }

    const basePrice = parsePositivePrice(vendor.service_base_price)
      ?? parsePositivePrice(vendor.minimum_order_value);
    if (basePrice !== null) {
      return basePrice;
    }

    return toCardPrice(vendor.experience);
  };

  useEffect(() => {
    if (vendors.length === 0) {
      return;
    }

    let isMounted = true;

    const resolveVendorLocations = async () => {
      const next: Record<string, { lat: number; lng: number }> = {};

      for (const vendor of vendors) {
        const vendorId = String(vendor.id);

        if (typeof vendor.latitude === "number" && typeof vendor.longitude === "number") {
          next[vendorId] = { lat: vendor.latitude, lng: vendor.longitude };
          saveVendorLocation(vendorId, {
            lat: vendor.latitude,
            lng: vendor.longitude,
            source: "stored",
            label: vendor.area || vendor.name || "Vendor location",
            savedAt: new Date().toISOString(),
          });
          continue;
        }

        const cached = getVendorLocation(vendorId);
        if (cached) {
          next[vendorId] = { lat: cached.lat, lng: cached.lng };
          continue;
        }

        const parsed = parseCoordinatesFromArea(vendor.area || "");
        if (parsed) {
          next[vendorId] = parsed;
          saveVendorLocation(vendorId, {
            lat: parsed.lat,
            lng: parsed.lng,
            source: "stored",
            label: vendor.area || vendor.name || "Vendor location",
            savedAt: new Date().toISOString(),
          });
          continue;
        }

        if (!vendor.area?.trim()) {
          continue;
        }

        try {
          const geocoded = await geocodeArea(vendor.area);
          if (geocoded) {
            next[vendorId] = { lat: geocoded.lat, lng: geocoded.lng };
            saveVendorLocation(vendorId, {
              lat: geocoded.lat,
              lng: geocoded.lng,
              source: "geocoded",
              label: geocoded.label,
              savedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Vendor geocoding failed", error);
        }

        // Respect Nominatim usage by spacing requests.
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      if (isMounted) {
        setVendorLocations(next);
      }
    };

    resolveVendorLocations();

    return () => {
      isMounted = false;
    };
  }, [vendors]);

  const openShop = (vendor: Vendor) => {
    if (vendor.is_active === false) {
      return;
    }

    const resolvedServiceId = selectedService ? String(selectedService.id) : serviceId;
    
    // Don't proceed without a valid service ID
    if (!resolvedServiceId) {
      return;
    }

    const resolvedServiceName = selectedService?.name || searchParams.get("serviceQuery") || "Service";
    const resolvedServiceDescription = selectedService?.description || undefined;
    const selectedPrice = getVendorFinalPrice(vendor);
    const selectedItemName = selectedSubServiceLabel || `${resolvedServiceName} Visit`;

    initializeShopCart({
      vendorId: String(vendor.id),
      vendorName: vendor.name || "Shop",
      serviceId: resolvedServiceId,
      serviceName: resolvedServiceName,
      city: vendor.area || "",
      addressLine: vendor.area || "",
      items: [
        {
          id: `selected-${selectedItemName.toLowerCase().replace(/\s+/g, "-")}`,
          name: selectedItemName,
          price: selectedPrice,
          quantity: 1,
        },
      ],
    });

    mergeBookingDraft({
      serviceId: resolvedServiceId,
      serviceName: resolvedServiceName,
      serviceDescription: resolvedServiceDescription,
      addressLine: undefined,
    });

    router.push("/checkout?step=payment");
  };

  return (
    <main
      className="landing mobile-page-shell shops-mobile-shell"
      style={{
        minHeight: "100vh",
        padding: "0.75rem 0 2rem",
        background:
          "radial-gradient(circle at 85% 10%, rgba(122,106,0,0.12), transparent 36%), radial-gradient(circle at 15% 14%, rgba(30,144,255,0.1), transparent 35%), var(--off-white)",
      }}
    >
      <div className="container" style={{ maxWidth: "100%", padding: "0 clamp(0.35rem, 2vw, 0.75rem)" }}>
        <section className="shop-preorder-hero">
          <div className="shop-preorder-category">
            <span>
              🏬 Verified Service Partners
              {selectedSubService ? ` for ${selectedSubServiceLabel}` : ""}
            </span>
          </div>
        </section>

        {errorMessage ? (
          <p style={{ color: "#b42318", marginTop: "0.9rem" }}>{errorMessage}</p>
        ) : null}

        {loading ? (
          <p style={{ marginTop: "1rem", color: "var(--gray-500)" }}>Loading shops...</p>
        ) : (
          <>
            {selectedSubserviceDetails ? (
              <section
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--gray-200)",
                  borderRadius: 14,
                  padding: "0.95rem",
                  marginBottom: "0.8rem",
                }}
              >
                <h3 style={{ margin: "0 0 0.45rem", fontSize: "1rem", color: "#111827" }}>
                  {selectedSubserviceDetails.name}
                </h3>
                {selectedSubserviceDetails.note ? (
                  <p style={{ margin: "0 0 0.65rem", fontSize: "0.88rem", color: "#6b7280" }}>
                    {selectedSubserviceDetails.note}
                  </p>
                ) : null}

                {parseSubserviceArray(selectedSubserviceDetails.included).length > 0 ? (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "#065f46" }}>What's Included</p>
                    <p style={{ margin: "0.2rem 0 0", color: "#1f2937", fontSize: "0.84rem", lineHeight: 1.45 }}>
                      {parseSubserviceArray(selectedSubserviceDetails.included).join(" • ")}
                    </p>
                  </div>
                ) : null}

                {parseSubserviceArray(selectedSubserviceDetails.notIncluded).length > 0 ? (
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "#991b1b" }}>What's NOT Included</p>
                    <p style={{ margin: "0.2rem 0 0", color: "#4b5563", fontSize: "0.84rem", lineHeight: 1.45 }}>
                      {parseSubserviceArray(selectedSubserviceDetails.notIncluded).join(" • ")}
                    </p>
                  </div>
                ) : null}
              </section>
            ) : null}

          <section className="shop-feed-grid">
            {visibleVendors.length === 0 ? (
              <div
                style={{
                  background: "var(--white)",
                  border: "1px solid var(--gray-200)",
                  borderRadius: "14px",
                  padding: "1rem",
                  color: "var(--gray-600)",
                }}
              >
                No shops found for this service right now.
              </div>
            ) : (
              visibleVendors.map((vendor) => {
                const shopImages = parseVendorListField((vendor as Record<string, unknown>).shop_image_urls);
                const subserviceEntries = vendorSubserviceMap[String(vendor.id)] || [];
                const subServices = subserviceEntries.map((entry) => entry.name);
                const primaryImage = shopImages[0] || "";
                const isOffline = vendor.is_active === false;
                const finalPrice = getVendorFinalPrice(vendor);
                const ratingAverage = getVendorRatingAverage(vendor);
                const ratingCount = getVendorRatingCount(vendor);
                const ratingLabel = ratingCount > 0 && ratingAverage !== null
                  ? `★ ${ratingAverage.toFixed(1)} (${ratingCount})`
                  : "★ New";

                return (
                  <article
                    className="shop-feed-card"
                    key={String(vendor.id)}
                    role={isOffline ? "article" : "button"}
                    tabIndex={isOffline ? -1 : 0}
                    onClick={() => openShop(vendor)}
                    onKeyDown={(event) => {
                      if (!isOffline && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        openShop(vendor);
                      }
                    }}
                    style={{
                      cursor: isOffline ? "not-allowed" : "pointer",
                      filter: isOffline ? "grayscale(1)" : "none",
                      opacity: isOffline ? 0.88 : 1,
                    }}
                  >
                    <div
                      className="shop-feed-media"
                      style={{
                        background: SHOP_CARD_BACKGROUNDS[toCardVariantIndex(vendor.id)],
                      }}
                    >
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={`${vendor.name || "Shop"} preview`}
                          className="shop-feed-photo"
                          loading="lazy"
                        />
                      ) : (
                        <div className="shop-feed-placeholder">
                          No Photo Uploaded
                        </div>
                      )}
                      <span className="shop-feed-tag">
                        {selectedSubService
                          ? `${selectedSubServiceLabel}`
                          : `${selectedService?.name || "Service"}`}
                      </span>
                      <span className="shop-feed-save" aria-hidden="true" title="Save shop">
                        🔖
                      </span>
                      {isOffline ? (
                        <span
                          style={{
                            position: "absolute",
                            right: 10,
                            bottom: 10,
                            background: "rgba(17,24,39,0.92)",
                            color: "#fff",
                            borderRadius: 999,
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: 0.2,
                          }}
                        >
                          Not taking orders
                        </span>
                      ) : null}
                    </div>

                    <div className="shop-feed-content">
                      <div className="shop-feed-title-row">
                        <h3>{vendor.name || "Shop"}</h3>
                        <span className="shop-feed-rating">{ratingLabel}</span>
                      </div>

                      <p className="shop-feed-meta">
                        {typeof vendorDistances[String(vendor.id)] === "number"
                          ? `${toEtaMinutes(vendorDistances[String(vendor.id)]).toUpperCase()} | ${vendorDistances[String(vendor.id)].toFixed(1)} km`
                          : toEtaMinutes()}
                      </p>

                      <p className={`shop-feed-submeta ${subServices.length === 0 ? "shop-feed-submeta-empty" : ""}`}>
                        {(subServices.length > 0 ? subServices.slice(0, 3).join(" • ") : "Sub-services not added yet")}
                      </p>

                      <div className="shop-feed-footer">
                        <span className="shop-feed-price-chip shop-feed-price-chip--final">Final price ₹{finalPrice}</span>
                        <span className="shop-feed-cta">Continue</span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
          </>
        )}
      </div>

    </main>
  );
}

export default function ShopsPage() {
  return (
    <Suspense
      fallback={
        <main className="landing" style={{ minHeight: "100vh", padding: "6rem 0 2rem" }}>
          <div className="container" style={{ maxWidth: "100%", padding: "0 clamp(0.35rem, 2vw, 0.75rem)" }}>
            <p style={{ margin: 0, color: "var(--gray-500)" }}>Loading shops...</p>
          </div>
        </main>
      }
    >
      <ShopsPageContent />
    </Suspense>
  );
}
