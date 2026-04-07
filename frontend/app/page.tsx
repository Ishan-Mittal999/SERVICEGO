"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";
import { writeClientCache } from "@/lib/client-cache";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  detectUserLocation,
  readUserLocation,
  writeUserLocation,
  type UserLocation,
} from "@/lib/location";

type Service = {
  id: string | number;
  name: string;
  description: string;
  icon?: string;
  category?: string;
  tags?: string[];
  keywords?: string[];
  sub_services?: unknown;
};

type ServiceCard = {
  key: string;
  label: string;
  image: string;
  terms: string[];
  service: Service | null;
};

const SERVICE_IMAGE_LIBRARY: Array<{ image: string; label: string; terms: string[] }> = [
  { image: "/service_ac.webp", label: "AC", terms: ["ac", "air conditioner", "air conditioning", "split ac", "window ac", "hvac"] },
  { image: "/service_electrical.webp", label: "Electrical", terms: ["electrical", "electrician", "wiring", "electric", "switch", "socket", "mcb", "fan"] },
  { image: "/service_carpenter.webp", label: "Carpenter", terms: ["carpenter", "carpentry", "wood", "furniture", "wardrobe", "door"] },
  { image: "/service_chimney.webp", label: "Chimney", terms: ["chimney", "kitchen chimney", "exhaust"] },
  { image: "/service_cooler.webp", label: "Cooler", terms: ["cooler", "air cooler", "desert cooler"] },
  { image: "/service_fridge.webp", label: "Fridge", terms: ["fridge", "refrigerator", "refrigeration"] },
  { image: "/service_geyser.webp", label: "Geyser", terms: ["geyser", "water heater", "heater"] },
  { image: "/Subservices/auto-top-repair.webp", label: "Washing Machine", terms: ["washing", "washing machine", "wm", "top load", "front load", "laundry"] },
  { image: "/service_microwave.webp", label: "Microwave", terms: ["microwave", "oven", "otg"] },
  { image: "/service_ro.webp", label: "RO", terms: ["ro", "water purifier", "purifier", "aquaguard", "water filter"] },
];

const REQUIRES_SUBSERVICE_SERVICE_KEYS = new Set([
  "ac",
  "washing_machine",
  "geyser",
]);

const normalizeText = (value: string) => value.trim().toLowerCase();

const isACServiceName = (normalizedName: string) => {
  return /\bac\b/.test(normalizedName)
    || normalizedName.includes("air conditioner")
    || normalizedName.includes("air conditioning");
};

const getServiceFlowKey = (serviceName: string) => {
  const normalized = normalizeText(serviceName);

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

const findServiceByFlowKey = (serviceList: Service[], serviceName: string) => {
  const targetKey = getServiceFlowKey(serviceName);
  return serviceList.find((service) => getServiceFlowKey(service.name || "") === targetKey) || null;
};

const shouldSkipSubservice = (serviceName: string) => {
  return !REQUIRES_SUBSERVICE_SERVICE_KEYS.has(getServiceFlowKey(serviceName));
};

const parseServiceSubservices = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);
      if (parsed == null) {
        return [];
      }
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
      }
    } catch {
      // Fallback to comma-separated values.
    }

    return normalized
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  return [];
};

const serviceNeedsSubserviceSelection = (service: Service) => {
  const hasDefinedSubservices =
    (service as Record<string, unknown>).sub_services !== undefined;

  if (hasDefinedSubservices) {
    return parseServiceSubservices(service.sub_services).length > 0;
  }

  return !shouldSkipSubservice(service.name || "");
};

const getServiceSearchScore = (service: Service, query: string) => {
  if (!query) {
    return 1;
  }

  const normalizedName = normalizeText(service.name || "");
  const normalizedDescription = normalizeText(service.description || "");
  const normalizedCategory = normalizeText(service.category || "");
  const tagTokens = (service.tags ?? []).map((tag) => normalizeText(tag));
  const keywordTokens = (service.keywords ?? []).map((keyword) => normalizeText(keyword));
  const allTokens = [normalizedName, normalizedDescription, normalizedCategory, ...tagTokens, ...keywordTokens].join(" ");

  let score = 0;

  if (normalizedName === query) {
    score += 120;
  }
  if (normalizedName.startsWith(query)) {
    score += 70;
  }
  if (normalizedName.includes(query)) {
    score += 55;
  }
  if (normalizedCategory.includes(query)) {
    score += 35;
  }
  if (normalizedDescription.includes(query)) {
    score += 25;
  }
  if (tagTokens.some((tag) => tag.includes(query))) {
    score += 20;
  }
  if (keywordTokens.some((keyword) => keyword.includes(query))) {
    score += 18;
  }

  const queryWords = query.split(/\s+/).filter(Boolean);
  if (queryWords.length > 1 && queryWords.every((word) => allTokens.includes(word))) {
    score += 20;
  }

  return score;
};

const getServiceDisplayIcon = (service: Service) => {
  const source = `${service.name || ""} ${service.category || ""} ${(service.tags || []).join(" ")}`.toLowerCase();

  if (source.includes("plumb")) {
    return "🚰";
  }
  if (source.includes("elect")) {
    return "💡";
  }
  if (source.includes("clean")) {
    return "🧼";
  }
  if (source.includes("ac") || source.includes("air")) {
    return "❄️";
  }
  if (source.includes("paint")) {
    return "🎨";
  }
  if (source.includes("carp")) {
    return "🪚";
  }

  return service.icon || "🛠️";
};

const getServiceImageConfig = (service: Service) => {
  const source = `${service.name || ""} ${service.description || ""} ${service.category || ""} ${(service.tags || []).join(" ")} ${(service.keywords || []).join(" ")}`.toLowerCase();
  const match = SERVICE_IMAGE_LIBRARY.find((entry) => entry.terms.some((term) => source.includes(term)));
  return match || null;
};

export default function HomePage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [searchHasRun, setSearchHasRun] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [enableHeroVideo, setEnableHeroVideo] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ✅ CALL CUSTOM HOOK HERE
  useScrollReveal(services);

  const primeSubservicesCache = (service: Service, prefetchRoute = false) => {
    const cacheKey = `subservices:${String(service.id)}:`;
    const route = `/subservices?serviceId=${encodeURIComponent(String(service.id))}&serviceName=${encodeURIComponent(
      service.name || ""
    )}`;

    // Optimistic cache lets subservices page render instantly while network data hydrates.
    writeClientCache(cacheKey, {
      services: [service],
      vendors: [],
    });

    if (prefetchRoute) {
      router.prefetch(route);
    }

    void (async () => {
      try {
        const [serviceResponse, vendorsResponse] = await Promise.all([
          fetch(apiUrl(`/services/${encodeURIComponent(String(service.id))}`), { cache: "force-cache" }),
          fetch(
            apiUrl(
              `/vendors?serviceId=${encodeURIComponent(String(service.id))}&serviceName=${encodeURIComponent(
                service.name || ""
              )}&limit=100`
            ),
            { cache: "force-cache" }
          ),
        ]);

        if (!serviceResponse.ok || !vendorsResponse.ok) {
          return;
        }

        const serviceDataRaw = await serviceResponse.json();
        const vendorsDataRaw = await vendorsResponse.json();
        const serviceData = serviceDataRaw.data || null;
        const vendorsData = vendorsDataRaw.data || (Array.isArray(vendorsDataRaw) ? vendorsDataRaw : []);

        writeClientCache(cacheKey, {
          services: serviceData ? [serviceData] : [service],
          vendors: vendorsData,
        });
      } catch {
        // Best-effort cache warm-up only.
      }
    })();
  };

  /* ================= FETCH SERVICES ================= */
  useEffect(() => {
    
    const fetchServices = async () => {
      try {
        const servicesRes = await fetch(apiUrl("/services"));

        if (!servicesRes.ok) {
          throw new Error(`Services API failed with ${servicesRes.status}`);
        }

        const servicesDataRaw = await servicesRes.json();
        // Support both array and paginated object formats
        const servicesData = servicesDataRaw.data || (Array.isArray(servicesDataRaw) ? servicesDataRaw : []);

        setServices(servicesData);
        setServicesError(null);
      } catch (err) {
        console.error("Failed to fetch services", err);
        setServicesError("Unable to load services right now. Please refresh in a minute.");
      } finally {
        setLoading(false);
      }
    };
    

    fetchServices();
  }, []);

  useEffect(() => {
    if (services.length === 0) {
      return;
    }

    const prefetchSubservices = () => {
      const topServices = services
        .filter((service) => REQUIRES_SUBSERVICE_SERVICE_KEYS.has(getServiceFlowKey(service.name || "")))
        .slice(0, 3);

      topServices.forEach((service) => {
        primeSubservicesCache(service, true);
      });
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const requestIdleCallback = window.requestIdleCallback as (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      const cancelIdleCallback = window.cancelIdleCallback as (handle: number) => void;

      const idleHandle = requestIdleCallback(() => {
        prefetchSubservices();
      });

      return () => {
        cancelIdleCallback(idleHandle);
      };
    }

    prefetchSubservices();
    return undefined;
  }, [services]);

  const detectAndSaveUserLocation = async (showErrorToUser = true) => {
    try {
      setIsDetectingLocation(true);
      const detected = await detectUserLocation();
      writeUserLocation(detected);
      setUserLocation(detected);
      setLocationError(null);
    } catch (error) {
      console.error("Failed to detect location", error);
      if (showErrorToUser) {
        setLocationError("Location unavailable. Showing quick picks.");
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    const stored = readUserLocation();
    if (stored) {
      setUserLocation(stored);
      return;
    }

    // Silent auto-try on first visit. Show error only when user taps location button.
    detectAndSaveUserLocation(false);
  }, []);

  useEffect(() => {
    const navigatorWithConnection = navigator as Navigator & {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    };

    const connection = navigatorWithConnection.connection;

    // Keep the poster on very slow/data-saver connections.
    if (connection?.saveData || (connection?.effectiveType ?? "").includes("2g")) {
      return;
    }

    const loadTimer = window.setTimeout(() => {
      setEnableHeroVideo(true);
    }, 300);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, []);

  useEffect(() => {
    if (!enableHeroVideo || heroVideoReady) {
      return;
    }

    const failSafeTimer = window.setTimeout(() => {
      setHeroVideoFailed(true);
    }, 9000);

    return () => {
      window.clearTimeout(failSafeTimer);
    };
  }, [enableHeroVideo, heroVideoReady]);

  /* ================= ANIMATIONS ================= */
  useEffect(() => {
    const counters = document.querySelectorAll<HTMLElement>(".trust-number");

    counters.forEach((counter) => {
      const target = Number(counter.getAttribute("data-count"));
      if (!target) return;

      let current = 0;
      const increment = target / 100;

      const updateCount = () => {
        if (current < target) {
          current += increment;
          counter.innerText = Math.ceil(current).toString();
          setTimeout(updateCount, 20);
        } else {
          counter.innerText = target.toString() + "+";
        }
      };

      updateCount();
    });

    return () => {};
  }, []);

  const normalizedSearchTerm = useMemo(() => normalizeText(searchTerm), [searchTerm]);

  const servicesWithImages = useMemo(
    () => services.filter((service) => Boolean(getServiceImageConfig(service)?.image)),
    [services]
  );

  const serviceCards = useMemo<ServiceCard[]>(() => {
    return SERVICE_IMAGE_LIBRARY.map((entry) => {
      const matchedService = services.find(
        (service) => getServiceImageConfig(service)?.image === entry.image
      ) ?? null;

      return {
        key: entry.image,
        label: entry.label,
        image: entry.image,
        terms: entry.terms,
        service: matchedService,
      };
    });
  }, [services]);

  const resolveServiceForCard = (card: ServiceCard) => {
    if (card.service) {
      return card.service;
    }

    const keyMatchedService = findServiceByFlowKey(services, card.label);
    if (keyMatchedService) {
      return keyMatchedService;
    }

    const queries = [card.label, ...card.terms];
    const best = services
      .map((service) => ({
        service,
        score: Math.max(...queries.map((query) => getServiceSearchScore(service, normalizeText(query)))),
      }))
      .sort((left, right) => right.score - left.score)[0];

    return best && best.score > 0 ? best.service : null;
  };

  const openCardInShops = (card: ServiceCard) => {
    const matchedService = resolveServiceForCard(card);

    if (matchedService) {
      startBookingFlow(matchedService);
      return;
    }

    if (shouldSkipSubservice(card.label)) {
      router.push(
        `/shops?serviceQuery=${encodeURIComponent(card.label)}&serviceName=${encodeURIComponent(card.label)}`
      );
      return;
    }

    router.push(
      `/subservices?serviceQuery=${encodeURIComponent(card.label)}&serviceName=${encodeURIComponent(card.label)}`
    );
  };

  const filteredServices = useMemo(() => {
    if (!normalizedSearchTerm) {
      return servicesWithImages;
    }

    return servicesWithImages
      .map((service) => ({
        service,
        score: getServiceSearchScore(service, normalizedSearchTerm),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.service);
  }, [servicesWithImages, normalizedSearchTerm]);

  const filteredServiceCards = useMemo(() => {
    if (!normalizedSearchTerm) {
      return serviceCards;
    }

    return serviceCards.filter((card) => {
      if (normalizeText(card.label).includes(normalizedSearchTerm)) {
        return true;
      }

      if (!card.service) {
        return false;
      }

      return getServiceSearchScore(card.service, normalizedSearchTerm) > 0;
    });
  }, [serviceCards, normalizedSearchTerm]);

  const heroQuickServices = useMemo(() => filteredServiceCards, [filteredServiceCards]);

  const suggestions = useMemo(() => filteredServices.slice(0, 6), [filteredServices]);

  const openServiceShops = (service: Service) => {
    mergeBookingDraft({
      serviceId: String(service.id),
      serviceName: service.name,
      serviceDescription: service.description,
      bookingId: undefined,
    });

    if (!serviceNeedsSubserviceSelection(service)) {
      router.push(
        `/shops?serviceId=${encodeURIComponent(String(service.id))}&serviceName=${encodeURIComponent(service.name || "")}`
      );
      return;
    }

    primeSubservicesCache(service, true);

    router.push(
      `/subservices?serviceId=${encodeURIComponent(String(service.id))}&serviceName=${encodeURIComponent(service.name || "")}`
    );
  };

  const handleSearch = (query?: string) => {
    const nextValue = query ?? searchTerm;
    const normalizedQuery = normalizeText(nextValue);

    setSearchTerm(nextValue);
    setSubmittedQuery(nextValue.trim());
    setSearchHasRun(Boolean(normalizedQuery));
    setShowSuggestions(false);

    if (normalizedQuery) {
      const topMatch = services
        .map((service) => ({
          service,
          score: getServiceSearchScore(service, normalizedQuery),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)[0];

      if (topMatch?.service) {
        openServiceShops(topMatch.service);
        return;
      }

      document
        .getElementById("services")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSubmittedQuery("");
    setSearchHasRun(false);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  const startBookingFlow = (service: Service) => {
    openServiceShops(service);
  };

  return (
    <div className="landing">
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <Image src="/hero-bg.webp" alt="Hero Background" fill style={{ objectFit: "cover" }} priority />
        </div>

        <div className="container">
          <div className="hero-content">
            <div className="hero-location-row" aria-live="polite">
              <button
                type="button"
                className="hero-location-pill"
                onClick={() => {
                  void detectAndSaveUserLocation(true);
                }}
              >
                <span className="hero-location-marker" aria-hidden="true">📍</span>
                <span className="hero-location-copy">
                  {isDetectingLocation
                    ? "Detecting location..."
                    : userLocation
                      ? `${userLocation.area || userLocation.city || "Current location"}${userLocation.postcode ? ` - ${userLocation.postcode}` : ""}`
                      : "Enable location"}
                </span>
              </button>
            </div>

            <h1>
              Trusted <span className="highlight">Home Services</span>
              <br />
              at Your Doorstep
            </h1>

            <p>
              Verified professionals. Transparent pricing.
              Quick bookings in minutes.
            </p>
            <div className="hero-search-row">
              <div className="hero-search-block">
                <div className="hero-search">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for services (e.g., Plumbing)"
                    value={searchTerm}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSearchHasRun(false);
                      setSubmittedQuery("");
                      setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                      if (e.key === "Escape") {
                        setShowSuggestions(false);
                      }
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="hero-search-clear"
                      onClick={clearSearch}
                      aria-label="Clear search"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                  >
                    Search
                  </button>
                </div>

                {showSuggestions && normalizedSearchTerm && suggestions.length > 0 && (
                  <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
                    {suggestions.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        className="search-suggestion-item"
                        onClick={() => {
                          openServiceShops(service);
                        }}
                      >
                        <span className="suggestion-name">{service.name}</span>
                        <span className="suggestion-desc">{service.description}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="hero-service-strip" aria-label="Quick service cards">
                  {heroQuickServices.map((card) => (
                    <button
                      key={card.key}
                      type="button"
                      className="hero-service-pill"
                      onClick={() => openCardInShops(card)}
                      aria-label={card.label}
                    >
              <Image
                src={card.image}
                alt={card.label}
                className="hero-service-pill-image"
                width={80}
                height={80}
                loading="lazy"
              />
                      <span>{card.label}</span>
                    </button>
                  ))}
                </div>

                <div className="hero-badge">
                  <span className="checkmark">✔</span>
                  200+ Happy Customers
                </div>
              </div>

              <aside className="hero-ad-card" aria-label="ServiceGo promo video">
                <Image
                  src="/resized_to_small/hero-bg.webp"
                  alt="ServiceGo preview"
                  className={heroVideoReady ? "hero-ad-poster is-hidden" : "hero-ad-poster"}
                  width={500}
                  height={300}
                  priority
                />

                {enableHeroVideo && !heroVideoFailed && (
                  <video
                    className={heroVideoReady ? "hero-ad-video is-ready" : "hero-ad-video"}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="none"
                    poster="/hero-bg.webp"
                    onLoadedData={() => setHeroVideoReady(true)}
                    onError={() => setHeroVideoFailed(true)}
                  >
                    <source src="/homepage-ad.webm" type="video/webm" />
                  </video>
                )}

                {!enableHeroVideo && (
                  <p className="hero-ad-state">Loading optimized preview...</p>
                )}

                {heroVideoFailed && (
                  <p className="hero-ad-state">Network is slow. Showing quick preview image.</p>
                )}
              </aside>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="services-section">
        <div className="container">
          <h2 className="section-title animate-on-scroll">
            Our Services
          </h2>
          <p className="section-subtitle animate-on-scroll">
            Professional services delivered by verified experts
          </p>

          <p className="search-results-meta">
            {normalizedSearchTerm
              ? `Showing ${filteredServiceCards.length} result${filteredServiceCards.length === 1 ? "" : "s"} for "${submittedQuery || searchTerm.trim()}"`
              : `Showing all ${serviceCards.length} services`}
          </p>

          <div className="services-grid">
            
            {loading ? (
              <p>Loading services...</p>
            ) : servicesError ? (
              <p>{servicesError}</p>
            ) : filteredServiceCards.length === 0 ? (
              <p>
                No services matched "{submittedQuery || searchTerm.trim()}". Try keywords like AC, Electrical, or Carpenter.
              </p>
            ) : (
              filteredServiceCards.map((card) => {
                const displayLabel = (card.service?.name || "").trim() || card.label;

                return (
                  <button
                    key={card.key}
                    type="button"
                    className={`service-card service-card--icon animate-on-scroll ${searchHasRun ? "visible" : ""}`}
                    onClick={() => openCardInShops(card)}
                    aria-label={displayLabel}
                    title={displayLabel}
                  >
                    <div className="service-icon" aria-hidden="true">
                    <Image
                      src={card.image}
                      alt={displayLabel}
                      className="service-icon-image"
                      width={80}
                      height={80}
                      loading="lazy"
                    />
                    </div>
                    <h3>{displayLabel}</h3>
                  </button>
                );
              })
            )}
            
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="trust-bar">
        <div className="container">
          <div className="trust-item">
            <span
              className="trust-number"
              data-count="200"
            >
              0
            </span>
            <span className="trust-label">
              Happy Customers
            </span>
          </div>

          <div className="trust-item">
            <span
              className="trust-number"
              data-count="20"
            >
              0
            </span>
            <span className="trust-label">
              Verified Professionals
            </span>
          </div>

          <div className="trust-item">
            <span className="trust-number">
              4.8★
            </span>
            <span className="trust-label">
              Average Rating
            </span>
          </div>

          <div className="trust-item">
            <span className="trust-number">
              24/7
            </span>
            <span className="trust-label">
              Customer Support
            </span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="how-it-works">
        <div className="container">
          <h2 className="section-title animate-on-scroll">
            How It Works
          </h2>
          <p className="section-subtitle animate-on-scroll">
            Search, confirm location, create booking, and connect with available vendors
          </p>

          <div className="steps-flow">
            {[
              {
                icon: "🔎",
                title: "Search Service",
                desc: "Pick the service you need and tap book from the home page.",
              },
              {
                icon: "📍",
                title: "Location & Pricing",
                desc: "Confirm your location, compare packages, and select add-ons.",
              },
              {
                icon: "✅",
                title: "Create Booking",
                desc: "Place your booking and nearby vendors get instant notifications.",
              },
              {
                icon: "👷",
                title: "Vendor Accepts",
                desc: "An available vendor accepts your request and starts the service.",
              },
            ].map((step, index) => (
              <div
                key={index}
                className="step-item animate-on-scroll"
              >
                <div className="step-icon">
                  {step.icon}
                </div>
                <div className="step-number">
                  Step {index + 1}
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <span>© 2026 ServiceGo. All rights reserved.</span>
            <div className="footer-legal-links" aria-label="Legal links">
              <span>Use of this site is subject to our legal policies.</span>
              <Link href="/faqs">FAQs</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/cancellation-refund-policy">Cancellation & Refund Policy</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}