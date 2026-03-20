"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isVendorUser } from "@/lib/user-role";
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
};

const POPULAR_SEARCHES = ["Plumbing", "Electrical", "Cleaning", "AC Repair"];

const normalizeText = (value: string) => value.trim().toLowerCase();

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


export default function HomePage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isVendorAccount, setIsVendorAccount] = useState<boolean | null>(null);
  const [searchHasRun, setSearchHasRun] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [enableHeroVideo, setEnableHeroVideo] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ✅ CALL CUSTOM HOOK HERE
  useScrollReveal(services);

  /* ================= FETCH SERVICES ================= */
  useEffect(() => {
    
    const fetchServices = async () => {
      try {
        const servicesRes = await fetch(apiUrl("/services"), { cache: "no-store" });

        if (!servicesRes.ok) {
          throw new Error(`Services API failed with ${servicesRes.status}`);
        }

        const servicesData = await servicesRes.json();

        if (!Array.isArray(servicesData)) {
          throw new Error("Services API returned invalid response");
        }

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

/* ================= Get Logged-in User ================= */
  useEffect(() => {
  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  getUser();

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null);
    }
  );

  return () => {
    listener.subscription.unsubscribe();
  };
}, []);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      if (!user) {
        if (isMounted) {
          setIsVendorAccount(null);
        }
        return;
      }

      const vendorAccount = await isVendorUser(user.id);
      if (isMounted) {
        setIsVendorAccount(vendorAccount);
      }
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [user]);

  /* ================= ANIMATIONS ================= */
  useEffect(() => {
    const navbar = document.querySelector(".navbar");

    const handleScroll = () => {
      if (window.scrollY > 20) {
        navbar?.classList.add("scrolled");
      } else {
        navbar?.classList.remove("scrolled");
      }
    };

    window.addEventListener("scroll", handleScroll);

    

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

    return () => {
      window.removeEventListener("scroll", handleScroll);
      
    };
  }, []);

  const normalizedSearchTerm = useMemo(() => normalizeText(searchTerm), [searchTerm]);

  const filteredServices = useMemo(() => {
    if (!normalizedSearchTerm) {
      return services;
    }

    return services
      .map((service) => ({
        service,
        score: getServiceSearchScore(service, normalizedSearchTerm),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.service);
  }, [services, normalizedSearchTerm]);

  const suggestions = useMemo(() => filteredServices.slice(0, 6), [filteredServices]);

  const openServiceShops = (service: Service) => {
    mergeBookingDraft({
      serviceId: String(service.id),
      serviceName: service.name,
      serviceDescription: service.description,
      bookingId: undefined,
    });

    router.push(`/shops?serviceId=${encodeURIComponent(String(service.id))}`);
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
    setActiveTag(null);
    searchInputRef.current?.focus();
  };

  const startBookingFlow = (service: Service) => {
    openServiceShops(service);
  };

  const userHandle = user?.email?.split("@")[0] || "User";
  const profileInitial = userHandle.charAt(0).toUpperCase();
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="landing">
      {/* NAVBAR */}
      <header className="navbar">
        <div className="container">
          <Link href="/" className="navbar-logo" aria-label="Go to homepage" onClick={closeMobileNav}>
            <img src="/logo.png" alt="ServiceGo" className="logo-icon" />
            <span>ServiceGo</span>
          </Link>

          <button
            type="button"
            className={mobileNavOpen ? "hamburger active" : "hamburger"}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={mobileNavOpen ? "nav-links active" : "nav-links"}>
  <a href="#services" onClick={closeMobileNav}>Services</a>
  <a href="#how" onClick={closeMobileNav}>How It Works</a>

  {!user ? (
    <>
      <a
        onClick={() => {
          closeMobileNav();
          router.push("/auth/login");
        }}
        style={{ cursor: "pointer" }}
      >
        Login
      </a>

      <a
        className="nav-cta"
        onClick={() => {
          closeMobileNav();
          router.push("/auth/signup");
        }}
        style={{ cursor: "pointer" }}
      >
        Sign Up
      </a>
    </>
  ) : isVendorAccount ? (
    <>
      <a
        className="nav-cta"
        onClick={() => {
          closeMobileNav();
          router.push("/vendor/dashboard");
        }}
        style={{ cursor: "pointer" }}
      >
        Vendor Dashboard
      </a>

      <button
        type="button"
        className="profile-nav-button"
        onClick={() => {
          closeMobileNav();
          router.push("/profile");
        }}
        aria-label="My Profile"
        title={`My Profile (${userHandle})`}
      >
        {profileInitial}
      </button>

      <a
        onClick={async () => {
          closeMobileNav();
          await supabase.auth.signOut();
          router.refresh();
        }}
        style={{ cursor: "pointer" }}
      >
        Logout
      </a>
    </>
  ) : isVendorAccount === null ? (
    <span style={{ color: "var(--gray-500)" }}>Loading account...</span>
  ) : (
    <>
      <a
        onClick={() => {
          closeMobileNav();
          router.push("/bookings");
        }}
        style={{ cursor: "pointer", marginRight: "1rem" }}
      >
        My Bookings
      </a>

      <button
        type="button"
        className="profile-nav-button"
        onClick={() => {
          closeMobileNav();
          router.push("/profile");
        }}
        aria-label="My Profile"
        title={`My Profile (${userHandle})`}
      >
        {profileInitial}
      </button>

      <a
        className="nav-cta"
        onClick={async () => {
          closeMobileNav();
          await supabase.auth.signOut();
          router.refresh();
        }}
        style={{ cursor: "pointer" }}
      >
        Logout
      </a>
    </>
  )}
</nav>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg">
          <img src="/hero-bg.png" alt="Hero Background" />
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
              <span className="hero-location-hint">{locationError || "Showing nearby shops based on your location."}</span>
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
                      setActiveTag(null);
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
                          setActiveTag(null);
                        }}
                      >
                        <span className="suggestion-name">{service.name}</span>
                        <span className="suggestion-desc">{service.description}</span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="search-helper-text">
                  Search by service name, problem type, or category.
                </p>

                <div className="popular-tags">
                  {POPULAR_SEARCHES.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={activeTag === tag ? "popular-tag active" : "popular-tag"}
                      onClick={() => {
                        setActiveTag(tag);
                        handleSearch(tag);
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="hero-badge">
                  <span className="checkmark">✔</span>
                  200+ Happy Customers
                </div>
              </div>

              <aside className="hero-ad-card" aria-label="ServiceGo promo video">
                <img
                  src="/hero-bg.png"
                  alt="ServiceGo preview"
                  className={heroVideoReady ? "hero-ad-poster is-hidden" : "hero-ad-poster"}
                />

                {enableHeroVideo && !heroVideoFailed && (
                  <video
                    className={heroVideoReady ? "hero-ad-video is-ready" : "hero-ad-video"}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    poster="/hero-bg.png"
                    onLoadedData={() => setHeroVideoReady(true)}
                    onError={() => setHeroVideoFailed(true)}
                  >
                    <source src="/homepage-ad.mp4" type="video/mp4" />
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
              ? `Showing ${filteredServices.length} result${filteredServices.length === 1 ? "" : "s"} for "${submittedQuery || searchTerm.trim()}"`
              : `Showing all ${services.length} services`}
          </p>

          <div className="services-grid">
            
            {loading ? (
              <p>Loading services...</p>
            ) : servicesError ? (
              <p>{servicesError}</p>
            ) : filteredServices.length === 0 ? (
              <p>
                No services matched "{submittedQuery || searchTerm.trim()}". Try keywords like Plumbing, Cleaning, or AC.
              </p>
            ) : (
              filteredServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  className={`service-card service-card--icon animate-on-scroll ${searchHasRun ? "visible" : ""}`}
                  onClick={() => startBookingFlow(service)}
                  aria-label={service.name}
                  title={service.name}
                >
                  <div className="service-icon" aria-hidden="true">
                    {getServiceDisplayIcon(service)}
                  </div>
                </button>
              ))
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
            Search, sign up, confirm location, choose pricing, and wait for assignment
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
                icon: "⏳",
                title: "Wait for Assignment",
                desc: "Your booking goes live while our team assigns the right vendor.",
              },
              {
                icon: "👷",
                title: "Vendor Assigned",
                desc: "The page updates with vendor details as soon as assignment happens.",
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
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}