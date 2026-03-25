"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { isVendorUser } from "@/lib/user-role";
import {
  detectUserLocation,
  readUserLocation,
  writeUserLocation,
  type UserLocation,
} from "@/lib/location";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import ServicesGrid from "@/components/ServicesGrid";
import LazyVideo from "@/components/LazyVideo";
import Image from "next/image";
import Link from "next/link";

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

export default function HomePage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isVendorAccount, setIsVendorAccount] = useState<boolean | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [heroVideoFailed, setHeroVideoFailed] = useState(false);

  // Scroll reveal for animations
  useScrollReveal(services);

  // Fetch services with error handling and caching
  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Check cache first
        const cached = sessionStorage.getItem('cached-services');
        const cachedTimestamp = sessionStorage.getItem('cached-services-timestamp');
        
        const isCacheValid = cached && cachedTimestamp && 
          (Date.now() - parseInt(cachedTimestamp)) < 5 * 60 * 1000; // 5 minutes
        
        if (isCacheValid) {
          setServices(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const servicesRes = await fetch(apiUrl("/services"));
        if (!servicesRes.ok) {
          throw new Error(`Services API failed with ${servicesRes.status}`);
        }

        const servicesDataRaw = await servicesRes.json();
        const servicesData = servicesDataRaw.data || 
          (Array.isArray(servicesDataRaw) ? servicesDataRaw : []);

        setServices(servicesData);
        setServicesError(null);
        
        // Cache the results
        sessionStorage.setItem('cached-services', JSON.stringify(servicesData));
        sessionStorage.setItem('cached-services-timestamp', Date.now().toString());
      } catch (err) {
        console.error("Failed to fetch services", err);
        setServicesError("Unable to load services right now. Please refresh in a minute.");
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // User location detection
  useEffect(() => {
    const stored = readUserLocation();
    if (stored) {
      setUserLocation(stored);
      return;
    }

    // Silent auto-try on first visit
    const detectAndSaveUserLocation = async (showErrorToUser = false) => {
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

    detectAndSaveUserLocation(false);
  }, []);

  // User authentication
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

  // User role detection
  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      if (!user) {
        if (isMounted) setIsVendorAccount(null);
        return;
      }

      const vendorAccount = await isVendorUser(user.id);
      if (isMounted) setIsVendorAccount(vendorAccount);
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Scroll animations
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
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Location detection handler
  const handleDetectLocation = useCallback(async () => {
    try {
      setIsDetectingLocation(true);
      const detected = await detectUserLocation();
      writeUserLocation(detected);
      setUserLocation(detected);
      setLocationError(null);
    } catch (error) {
      console.error("Failed to detect location", error);
      setLocationError("Location unavailable. Showing quick picks.");
    } finally {
      setIsDetectingLocation(false);
    }
  }, []);

  // Search handler
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/shops?search=${encodeURIComponent(searchTerm)}`);
    }
  }, [searchTerm, router]);

  // Service selection handler
  const handleServiceSelect = useCallback((service: Service) => {
    // You can implement custom service selection logic here
    console.log("Service selected:", service.name);
  }, []);

  return (
    <div className="homepage-optimized">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Trusted local services at your doorstep
          </h1>
          <p className="hero-subtitle">
            Book AC repair, electrical work, plumbing, carpentry, and more with verified professionals.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hero-search">
            <div className="search-input-wrapper">
              <input
                ref={searchInputRef}
                type="search"
                placeholder="What service do you need? (e.g., AC repair, electrician)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                aria-label="Search for services"
              />
              <button type="submit" className="search-button">
                Search
              </button>
            </div>
          </form>

          {/* Location */}
          <div className="hero-location">
            {userLocation ? (
              <div className="location-detected">
                <span className="location-icon" aria-hidden="true">📍</span>
                <span className="location-text">
                  Serving <strong>{userLocation.city || userLocation.area}</strong>
                </span>
              </div>
            ) : (
              <button
                onClick={handleDetectLocation}
                disabled={isDetectingLocation}
                className="location-detect-button"
              >
                {isDetectingLocation ? (
                  <>Detecting location...</>
                ) : (
                  <>
                    <span className="location-icon" aria-hidden="true">📍</span>
                    Detect my location for better results
                  </>
                )}
              </button>
            )}
            {locationError && (
              <p className="location-error" role="alert">{locationError}</p>
            )}
          </div>
        </div>

        {/* Hero Video - Lazy Loaded */}
        <div className="hero-video-container">
          <LazyVideo
            src="/homepage-ad.webm"
            poster="/hero-bg.webp"
            className="hero-video"
            onReady={() => setHeroVideoReady(true)}
            onError={() => setHeroVideoFailed(true)}
          />
          {!heroVideoReady && !heroVideoFailed && (
            <div className="video-loading">Loading promo video...</div>
          )}
          {heroVideoFailed && (
            <div className="video-fallback">
              <Image
                src="/hero-bg.webp"
                alt="ServiceGo Hero"
                fill
                className="video-fallback-image"
                priority
              />
            </div>
          )}
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="section-header">
          <h2 className="section-title">Popular Services</h2>
          <p className="section-subtitle">
            Choose from our most requested services
          </p>
        </div>

        {loading ? (
          <div className="services-loading">
            <div className="loading-spinner" aria-label="Loading services"></div>
            <p>Loading services...</p>
          </div>
        ) : servicesError ? (
          <div className="services-error" role="alert">
            <p>{servicesError}</p>
            <button
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        ) : (
          <ServicesGrid
            services={services}
            searchTerm={searchTerm}
            onServiceSelect={handleServiceSelect}
          />
        )}
      </section>

      {/* Stats Section */}
      <section className="stats-section animate-on-scroll">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number trust-number" data-count="5000">
              5000+
            </div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat-card">
            <div className="stat-number trust-number" data-count="200">
              200+
            </div>
            <div className="stat-label">Verified Vendors</div>
          </div>
          <div className="stat-card">
            <div className="stat-number trust-number" data-count="50">
              50+
            </div>
            <div className="stat-label">Cities Served</div>
          </div>
          <div className="stat-card">
            <div className="stat-number trust-number" data-count="24">
              24/7
            </div>
            <div className="stat-label">Support Available</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section animate-on-scroll">
        <div className="cta-content">
          <h2 className="cta-title">Ready to get your service booked?</h2>
          <p className="cta-subtitle">
            Join thousands of satisfied customers who trust ServiceGo for their home service needs.
          </p>
          <div className="cta-buttons">
            <Link href="/shops" className="cta-button primary">
              Browse All Services
            </Link>
            {!user && (
              <Link href="/auth/signup" className="cta-button secondary">
                Sign Up for Free
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}