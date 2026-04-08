"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { formatPrice, mergeBookingDraft } from "@/lib/booking-flow";
import { readClientCache, writeClientCache } from "@/lib/client-cache";
import { SubserviceDetail } from "@/components/SubserviceDetail";

type Service = {
  id: string | number;
  name: string;
  description?: string;
  sub_services?: unknown;
};

type Vendor = {
  id: string | number;
  service_id?: string | number;
  service_ids?: Array<string | number> | unknown;
  selected_service_names?: string[] | unknown;
  sub_services?: unknown;
  sub_service_prices?: unknown;
};

type SubserviceItem = {
  name: string;
  included?: string[] | string;
  notIncluded?: string[] | string;
  note?: string;
};

type PredefinedSubservice = string | SubserviceItem;

type SubserviceCard = {
  id: string;
  name: string;
  isDetailed: boolean;
  details?: SubserviceItem;
  imageSrc?: string;
  startingPrice?: number | null;
};

type PricedSubservice = {
  name: string;
  price: number | null;
};

type SubservicesCachePayload = {
  services: Service[];
  vendors: Vendor[];
};

const SUBSERVICES_CACHE_TTL_MS = 5 * 60 * 1000;

const PREDEFINED_SUBSERVICE_MAP: Record<string, PredefinedSubservice[]> = {
  ac: ["Foam jet service", "AC checkup", "AC installation", "AC uninstallation"],
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
  geyser: ["Install", "Uninstall", "Repair"],
  chimney: [],
  refrigerator: [],
  ro: [],
  microwave: [],
  heater: [],
  cooler: [],
};

const SERVICE_SUBSERVICE_KEYWORDS: Record<string, string[]> = {
  ac: ["ac", "air conditioner", "cooling"],
  washing_machine: ["washing", "machine", "top load", "front load"],
  geyser: ["geyser", "water heater", "heater"],
  chimney: ["chimney"],
  refrigerator: ["fridge", "refrigerator"],
  ro: ["ro", "purifier", "water filter"],
  microwave: ["microwave", "oven"],
  heater: ["heater"],
  cooler: ["cooler"],
};

const SUBSERVICE_IMAGE_FILES = [
  "AC-form-service.webp",
  "AC-install (1).webp",
  "ac-normal_service.webp",
  "AC-rent-service.webp",
  "AC-service.webp",
  "Ac service and diagnosis.webp",
  "AC-unistallation.webp",
  "ac_gas_refilling (1).webp",
  "Air Cooler Check-up.webp",
  "auto-front-repair.webp",
  "auto-top-repair.webp",
  "chimney -service.webp",
  "chimney checkup.webp",
  "Chimney Deep Cleaning.webp",
  "chimney normal cleaning.webp",
  "chimney-install.webp",
  "chimney-uninstall.webp",
  "Cooler Pad Replacement.webp",
  "deep-cleaning-front-load.webp",
  "deep-cleaning-top-load.webp",
  "Double Door Fridge Gas Charging.webp",
  "Fridge Check-up & Diagnosis.webp",
  "geyser-install.webp",
  "geyser checkup and diagnosis.webp",
  "geyser-uninstalled.webp",
  "microwave checkup.webp",
  "normal-cleaning-top-load-washing-machine.webp",
  "RO Purifier Check-up.webp",
  "RO-service.webp",
  "Side-by-Side (Almirah) Fridge Check-up.webp",
  "Single Door Fridge Gas Chargin.webp",
] as const;

const SUBSERVICE_TOKEN_ALIASES: Record<string, string> = {
  ac: "ac",
  conditioner: "ac",
  form: "foam",
  check: "checkup",
  diagnosis: "checkup",
  diagnostic: "checkup",
  installing: "install",
  installation: "install",
  uninstalling: "uninstall",
  uninstallation: "uninstall",
  uninstalled: "uninstall",
  unistallation: "uninstall",
  refilling: "charging",
  refill: "charging",
  chargin: "charging",
  auto: "automatic",
  almirah: "side",
  up: "checkup",
};

const SERVICE_IMAGE_HINTS: Record<string, string[]> = {
  ac: ["ac", "foam", "cooling", "gas", "install", "uninstall"],
  washing_machine: ["washing", "machine", "automatic", "front", "top", "load", "cleaning", "repair"],
  geyser: ["geyser", "heater", "install", "uninstall", "repair"],
  chimney: ["chimney", "cleaning", "checkup", "install", "uninstall"],
  refrigerator: ["fridge", "refrigerator", "door", "charging", "checkup"],
  ro: ["ro", "purifier", "checkup", "service"],
  microwave: ["microwave", "oven"],
  heater: ["heater"],
  cooler: ["cooler", "pad", "checkup"],
};

const normalizeImageKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toCanonicalToken = (token: string) => {
  const normalizedToken = token.trim().toLowerCase();
  return SUBSERVICE_TOKEN_ALIASES[normalizedToken] || normalizedToken;
};

const tokenizeImageKey = (value: string) =>
  normalizeImageKey(value)
    .split(" ")
    .map(toCanonicalToken)
    .filter(Boolean);

const scoreImageMatch = (subserviceName: string, fileName: string, serviceName: string) => {
  const subTokens = tokenizeImageKey(subserviceName);
  const fileTokens = new Set(tokenizeImageKey(fileName));
  const serviceTokens = SERVICE_IMAGE_HINTS[getServiceKey(serviceName)] || [];

  if (subTokens.length === 0 || fileTokens.size === 0) {
    return 0;
  }

  const normalizedSubservice = subTokens.join(" ");
  const normalizedFile = Array.from(fileTokens).join(" ");

  if (normalizedSubservice === normalizedFile) {
    return 100;
  }

  if (normalizedFile.includes(normalizedSubservice) || normalizedSubservice.includes(normalizedFile)) {
    return 70;
  }

  const sharedTokenCount = subTokens.filter((token) => fileTokens.has(token)).length;
  if (sharedTokenCount === 0) {
    return 0;
  }

  let score = Math.round((sharedTokenCount / subTokens.length) * 60);

  const serviceBoost = serviceTokens.filter((token) => fileTokens.has(toCanonicalToken(token))).length;
  score += serviceBoost * 8;

  return score;
};

const getSubserviceImagePath = (subserviceName: string, serviceName: string) => {
  const bestMatch = SUBSERVICE_IMAGE_FILES
    .map((fileName) => ({
      fileName,
      score: scoreImageMatch(subserviceName, fileName, serviceName),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (!bestMatch || bestMatch.score < 15) {
    return undefined;
  }

  return `/Subservices/${encodeURIComponent(bestMatch.fileName)}`;
};

const normalizeSubserviceText = (value: string) => value.trim().toLowerCase();

const isACServiceName = (normalizedName: string) => {
  return /\bac\b/.test(normalizedName)
    || normalizedName.includes("air conditioner")
    || normalizedName.includes("air conditioning");
};

const getServiceKey = (serviceName: string) => {
  const normalized = normalizeSubserviceText(serviceName);

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

const getSubserviceScore = (service: Service, query: string) => {
  if (!query) {
    return 0;
  }

  const name = normalizeSubserviceText(service.name || "");
  const description = normalizeSubserviceText(service.description || "");
  const combined = `${name} ${description}`;

  let score = 0;
  if (name === query) score += 100;
  if (name.startsWith(query)) score += 70;
  if (name.includes(query)) score += 50;
  if (description.includes(query)) score += 20;
  if (query.split(/\s+/).every((word) => combined.includes(word))) score += 15;

  return score;
};

const getSubserviceVisual = (itemId: string) => {
  const palette = [
    "linear-gradient(135deg, #f43f5e 0%, #ef4444 40%, #dc2626 100%)",
    "linear-gradient(135deg, #1d4ed8 0%, #06b6d4 48%, #0e7490 100%)",
    "linear-gradient(135deg, #16a34a 0%, #22c55e 45%, #15803d 100%)",
    "linear-gradient(135deg, #f97316 0%, #f59e0b 42%, #d97706 100%)",
  ];

  let score = 0;
  for (let index = 0; index < itemId.length; index += 1) {
    score += itemId.charCodeAt(index);
  }

  return palette[score % palette.length];
};

const parseVendorRawListField = (value: unknown): string[] => {
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
      // Fallback to comma separated values.
    }

    return normalized
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseVendorListField = (value: unknown): string[] => {
  const normalizeEntry = (entry: string) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      return "";
    }

    if (trimmed.includes("::")) {
      return String(trimmed.split("::")[0] || "").trim();
    }

    return trimmed;
  };

  return parseVendorRawListField(value)
    .map((item) => normalizeEntry(item))
    .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
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

const normalizeSubserviceMatchKey = (value: string) =>
  normalizeSubserviceText(value)
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
  const normalized = normalizeSubserviceText(value).replace(/\bchimeny\b/g, "chimney");

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
  const vendorTokenSet = new Set(vendorTokens);
  const selectedTokenSet = new Set(selectedTokens);

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

  return selectedTokens.every((token) => vendorTokenSet.has(token));
};

const parseVendorSubservicePricing = (vendor: Vendor): PricedSubservice[] => {
  const rawEntries = parseVendorRawListField((vendor as Record<string, unknown>).sub_services);
  const fallbackPriceMap = vendor.sub_service_prices;

  const exactPriceMap = new Map<string, number>();
  if (fallbackPriceMap && typeof fallbackPriceMap === "object" && !Array.isArray(fallbackPriceMap)) {
    Object.entries(fallbackPriceMap as Record<string, unknown>).forEach(([name, value]) => {
      const trimmedName = String(name || "").trim();
      const numericPrice = parsePositivePrice(value);
      if (trimmedName && numericPrice !== null) {
        exactPriceMap.set(trimmedName, numericPrice);
      }
    });
  }

  const deduped = new Map<string, PricedSubservice>();

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

    if (!name) {
      return;
    }

    const fallbackPrice = exactPriceMap.get(name) ?? null;

    deduped.set(name, {
      name,
      price: parsedPrice ?? fallbackPrice,
    });
  });

  return Array.from(deduped.values());
};

const parseServiceSubservices = (value: unknown): SubserviceItem[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        // If it's a detailed object with name property
        if (typeof item === "object" && item !== null && "name" in item) {
          return item as SubserviceItem;
        }
        // If it's a simple string, convert to basic SubserviceItem
        const nameStr = String(item || "").trim();
        if (nameStr && nameStr.toLowerCase() !== "null" && nameStr.toLowerCase() !== "undefined") {
          return { name: nameStr };
        }
        return null;
      })
      .filter((item) => item !== null) as SubserviceItem[];
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
          .map((item) => {
            if (typeof item === "object" && item !== null && "name" in item) {
              return item as SubserviceItem;
            }
            const nameStr = String(item || "").trim();
            if (nameStr && nameStr.toLowerCase() !== "null" && nameStr.toLowerCase() !== "undefined") {
              return { name: nameStr };
            }
            return null;
          })
          .filter((item) => item !== null) as SubserviceItem[];
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return normalized
      .split(",")
      .map((item) => {
        const nameStr = item.trim();
        return nameStr ? { name: nameStr } : null;
      })
      .filter((item) => item !== null) as SubserviceItem[];
  }

  return [];
};

const vendorHasService = (vendor: Vendor, service: Service | null) => {
  if (!service) {
    return true;
  }

  const targetServiceId = String(service.id);
  const targetServiceName = normalizeSubserviceText(service.name || "");

  if (String(vendor.service_id || "") === targetServiceId) {
    return true;
  }

  const vendorServiceIds = parseVendorListField((vendor as Record<string, unknown>).service_ids);
  if (vendorServiceIds.some((id) => String(id) === targetServiceId)) {
    return true;
  }

  const vendorServiceNames = parseVendorListField((vendor as Record<string, unknown>).selected_service_names);
  if (vendorServiceNames.some((name) => normalizeSubserviceText(name) === targetServiceName)) {
    return true;
  }

  return false;
};

const findBestServiceForQuery = (serviceList: Service[], query: string) => {
  if (!query) {
    return null;
  }

  const queryKey = getServiceKey(query);
  const exactKeyMatch = serviceList.find((service) => getServiceKey(service.name || "") === queryKey);
  if (exactKeyMatch) {
    return exactKeyMatch;
  }

  const best = serviceList
    .map((service) => ({
      service,
      score: getSubserviceScore(service, query),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return best && best.score >= 50 ? best.service : null;
};

const getPredefinedSubserviceName = (entry: PredefinedSubservice) =>
  typeof entry === "string" ? entry : entry.name;

const isSubserviceRelevantToService = (
  subserviceName: string,
  service: Service,
  predefinedForService: PredefinedSubservice[]
) => {
  const normalizedSubservice = normalizeSubserviceText(subserviceName);
  if (!normalizedSubservice) {
    return false;
  }

  const normalizedPredefined = predefinedForService
    .map((item) => normalizeSubserviceText(getPredefinedSubserviceName(item)));
  if (
    normalizedPredefined.some(
      (entry) =>
        entry === normalizedSubservice
        || normalizedSubservice.includes(entry)
        || entry.includes(normalizedSubservice)
    )
  ) {
    return true;
  }

  const serviceKey = getServiceKey(service.name || "");
  const keywords = SERVICE_SUBSERVICE_KEYWORDS[serviceKey] || [normalizeSubserviceText(service.name || "")];
  return keywords.some((keyword) => keyword && normalizedSubservice.includes(keyword));
};

const getSubserviceDescription = (name: string) => {
  const normalized = normalizeSubserviceText(name);
  if (normalized.includes("uninstall")) return "Best for clean removal and site-safe disconnection.";
  if (normalized.includes("install")) return "Ideal for safe installation with complete setup checks.";
  if (normalized.includes("repair") || normalized.includes("check")) return "Covers diagnosis and reliable issue resolution.";
  return "Trusted option for quick and reliable doorstep support.";
};

function SubservicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const serviceId = searchParams.get("serviceId") || "";
  const serviceQuery = normalizeSubserviceText(searchParams.get("serviceQuery") || "");
  const serviceName = (searchParams.get("serviceName") || "").trim();

  useEffect(() => {
    const loadData = async () => {
      const cacheKey = `subservices:${serviceId}:${serviceQuery}`;
      const cachedPayload = readClientCache<SubservicesCachePayload>(cacheKey, SUBSERVICES_CACHE_TTL_MS);
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
          const [serviceResponse, vendorsResponse] = await Promise.all([
            fetch(apiUrl(`/services/${encodeURIComponent(serviceId)}`), {
              cache: "force-cache",
            }),
            fetch(
              apiUrl(
                `/vendors?serviceId=${encodeURIComponent(serviceId)}&serviceName=${encodeURIComponent(
                  serviceName
                )}&limit=100`
              ),
              { cache: "force-cache" }
            ),
          ]);

          if (!serviceResponse.ok) {
            throw new Error(`Service API failed with ${serviceResponse.status}`);
          }

          if (!vendorsResponse.ok) {
            throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
          }

          const serviceDataRaw = await serviceResponse.json();
          const serviceData = serviceDataRaw.data || null;
          const vendorsDataRaw = await vendorsResponse.json();
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

          const nextServices = serviceData ? [serviceData] : [];

          setServices(nextServices);
          setVendors(vendorsData);
          setErrorMessage(null);
          writeClientCache(cacheKey, {
            services: nextServices,
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
        const resolvedService = findBestServiceForQuery(servicesData, serviceQuery);

        if (!resolvedService) {
          setServices(servicesData);
          setVendors([]);
          setErrorMessage(null);
          return;
        }

        const vendorsResponse = await fetch(
          apiUrl(
            `/vendors?serviceId=${encodeURIComponent(String(resolvedService.id))}&serviceName=${encodeURIComponent(
              resolvedService.name || ""
            )}&limit=100`
          ),
          { cache: "force-cache" }
        );

        if (!vendorsResponse.ok) {
          throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
        }

        const vendorsDataRaw = await vendorsResponse.json();
        const vendorsData = vendorsDataRaw.data || (Array.isArray(vendorsDataRaw) ? vendorsDataRaw : []);

        setServices(servicesData);
        setVendors(vendorsData);
        setErrorMessage(null);
        writeClientCache(cacheKey, {
          services: servicesData,
          vendors: vendorsData,
        });
      } catch (error) {
        console.error("Failed to load sub-services", error);
        if (!hasCachedPayload) {
          setErrorMessage("Unable to load sub-services right now. Please try again.");
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
      return services.find((service) => String(service.id) === String(serviceId)) ?? null;
    }

    if (!serviceQuery) {
      return null;
    }

    return findBestServiceForQuery(services, serviceQuery);
  }, [services, serviceId, serviceQuery]);

  const subserviceOptions = useMemo(() => {
    if (!selectedService) {
      return [];
    }

    const serviceDefinedSubservices = parseServiceSubservices(selectedService.sub_services);
    const hasServiceDefinedSubservices = (selectedService as Record<string, unknown>).sub_services !== undefined;
    if (hasServiceDefinedSubservices && serviceDefinedSubservices.length > 0) {
      return serviceDefinedSubservices;
    }

    const predefined = PREDEFINED_SUBSERVICE_MAP[getServiceKey(selectedService.name || "")] || [];
    const relatedVendors = vendors.filter((vendor) => vendorHasService(vendor, selectedService));
    const seen = new Set<string>();
    const options: SubserviceItem[] = predefined.map((item) =>
      typeof item === "string" ? { name: item } : item
    );
    predefined.forEach((item) => seen.add(normalizeSubserviceText(getPredefinedSubserviceName(item))));

    relatedVendors.forEach((vendor) => {
      parseVendorListField(vendor.sub_services).forEach((item) => {
        const normalized = normalizeSubserviceText(item);
        if (!normalized || seen.has(normalized)) {
          return;
        }

        if (!isSubserviceRelevantToService(item, selectedService, predefined)) {
          return;
        }
        seen.add(normalized);
        options.push({ name: item });
      });
    });

    return options;
  }, [vendors, selectedService]);

  const subserviceCards = useMemo<SubserviceCard[]>(
    () => subserviceOptions.map((item, index) => ({
      id: `${normalizeSubserviceText(item.name).replace(/\s+/g, "-")}-${index}`,
      name: item.name,
      isDetailed: Boolean(item.included || item.notIncluded || item.note),
      details: item,
      imageSrc: getSubserviceImagePath(item.name, selectedService?.name || ""),
      startingPrice: null,
    })),
    [subserviceOptions, selectedService]
  );

  const subserviceMinPriceMap = useMemo(() => {
    const priceMap: Record<string, number> = {};

    if (!selectedService) {
      return priceMap;
    }

    const relatedVendors = vendors.filter((vendor) => vendorHasService(vendor, selectedService));
    if (relatedVendors.length === 0) {
      return priceMap;
    }

    subserviceOptions.forEach((subservice) => {
      let minPrice: number | null = null;

      relatedVendors.forEach((vendor) => {
        const pricedEntries = parseVendorSubservicePricing(vendor);
        const match = pricedEntries.find((entry) =>
          isSubserviceNameMatch(subservice.name, entry.name, selectedService.name || "")
        );

        if (!match || match.price === null) {
          return;
        }

        if (minPrice === null || match.price < minPrice) {
          minPrice = match.price;
        }
      });

      if (minPrice !== null) {
        priceMap[normalizeSubserviceText(subservice.name)] = minPrice;
      }
    });

    return priceMap;
  }, [subserviceOptions, selectedService, vendors]);

  const subserviceCardsWithPrice = useMemo(
    () =>
      subserviceCards.map((item) => ({
        ...item,
        startingPrice: subserviceMinPriceMap[normalizeSubserviceText(item.name)] ?? null,
      })),
    [subserviceCards, subserviceMinPriceMap]
  );

  const openShopsForSubservice = (subService: string) => {
    if (!selectedService) {
      router.push(`/shops?serviceQuery=${encodeURIComponent(subService)}`);
      return;
    }

    mergeBookingDraft({
      serviceId: String(selectedService.id),
      serviceName: selectedService.name,
      serviceDescription: selectedService.description,
    });

    router.push(
      `/shops?serviceId=${encodeURIComponent(String(selectedService.id))}&serviceName=${encodeURIComponent(
        selectedService.name || ""
      )}&subService=${encodeURIComponent(subService)}`
    );
  };

  return (
    <main className="landing mobile-page-shell shops-mobile-shell">
      <div className="container service-menu-wrap" style={{ maxWidth: "980px" }}>
        <section className="shop-preorder-hero" style={{ paddingTop: "0.85rem" }}>
          <div className="shop-preorder-category">
            <span>
              🏬 Verified Service Plans
              {selectedService ? ` for ${selectedService.name}` : ""}
            </span>
          </div>
        </section>

        {errorMessage ? <p className="checkout-error-text">{errorMessage}</p> : null}

        <section className="service-menu-section">
          {loading ? <p style={{ color: "var(--gray-500)" }}>Loading service options...</p> : null}

          {!loading && subserviceCardsWithPrice.length > 0 ? (
            <>
              <h2 className="service-menu-section-title">Best Service Plans</h2>
              <div className="service-plan-grid">
                {subserviceCardsWithPrice.map((item) => {
                  if (item.isDetailed && item.details) {
                    return (
                      <SubserviceDetail
                        key={item.id}
                        item={item.details}
                        startingPrice={item.startingPrice}
                        onSelect={() => openShopsForSubservice(item.name)}
                        visualGradient={getSubserviceVisual(item.id)}
                        imageSrc={item.imageSrc}
                      />
                    );
                  }

                  // Fallback to simple card for non-detailed subservices
                  return (
                    <article
                      className="service-item-card"
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openShopsForSubservice(item.name)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openShopsForSubservice(item.name);
                        }
                      }}
                    >
                      <div className="service-item-content">
                        <span className="service-item-badge">Verified</span>
                        <h3>{item.name}</h3>
                        {item.startingPrice !== null ? (
                          <p style={{ margin: "0.2rem 0 0.35rem", fontWeight: 700, color: "#111827" }}>
                            Starting from {formatPrice(item.startingPrice)}
                          </p>
                        ) : null}
                        <p>{getSubserviceDescription(item.name)}</p>
                        <div className="service-item-note">Ideal for quick and reliable fixes.</div>
                      </div>

                      <div className="service-item-visual-wrap">
                        <div className="service-item-visual" style={{ background: getSubserviceVisual(item.id) }}>
                          {item.imageSrc ? (
                            <img
                              src={item.imageSrc}
                              alt={item.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "12px",
                              }}
                            />
                          ) : (
                            <span>Service plan</span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="service-item-add-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            openShopsForSubservice(item.name);
                          }}
                        >
                          Select
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}

          {!loading && subserviceCardsWithPrice.length === 0 ? (
            <div className="service-menu-empty">
              No sub-services found for this service right now.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function SubservicesPage() {
  return (
    <Suspense
      fallback={
        <main className="landing" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
          <p style={{ color: "var(--gray-500)" }}>Loading service options...</p>
        </main>
      }
    >
      <SubservicesPageContent />
    </Suspense>
  );
}
