"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import { mergeBookingDraft } from "@/lib/booking-flow";
import { useRouter } from "next/navigation";

type Service = {
  id: string | number;
  name: string;
  description: string;
  icon?: string;
};


export default function HomePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // ✅ CALL CUSTOM HOOK HERE
  useScrollReveal(services);

  /* ================= FETCH SERVICES ================= */
  useEffect(() => {
    
    const fetchServices = async () => {
      try {
        const res = await fetch(apiUrl("/services"));
        if (!res.ok) {
          throw new Error(`Services API failed with ${res.status}`);
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Services API returned invalid response");
        }

        setServices(data);
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

  const filteredServices = services.filter((service) =>
  service.name.toLowerCase().includes(searchTerm.toLowerCase())
);

  const startBookingFlow = (service: Service) => {
    mergeBookingDraft({
      serviceId: String(service.id),
      serviceName: service.name,
      serviceDescription: service.description,
      bookingId: undefined,
    });

    if (user) {
      router.push(`/booking/location?serviceId=${service.id}`);
    } else {
      router.push(
        `/auth/signup?next=${encodeURIComponent(`/booking/location?serviceId=${service.id}`)}`
      );
    }
  };

  return (
    <div className="landing">
      {/* NAVBAR */}
      <header className="navbar">
        <div className="container">
          <div className="navbar-logo">
            <img src="/logo.png" alt="ServiceGo" className="logo-icon" />
            <span>ServiceGo</span>
          </div>

          <nav className="nav-links">
  <a href="#services">Services</a>
  <a href="#how">How It Works</a>
  <a href="#pricing">Pricing</a>

  {!user ? (
    <>
      <a
        onClick={() => router.push("/auth/login")}
        style={{ cursor: "pointer" }}
      >
        Login
      </a>

      <a
        className="nav-cta"
        onClick={() => router.push("/auth/signup")}
        style={{ cursor: "pointer" }}
      >
        Sign Up
      </a>
    </>
  ) : (
    <>
      <a
        onClick={() => router.push("/bookings")}
        style={{ cursor: "pointer", marginRight: "1rem" }}
      >
        My Bookings
      </a>

      <span style={{ marginRight: "1rem" }}>
        {user.email?.split("@")[0]}
      </span>

      <a
        className="nav-cta"
        onClick={async () => {
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
                    type="text"
                    placeholder="Search for services (e.g., Plumbing)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <button
                    onClick={() =>
                      document
                        .getElementById("services")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Search
                  </button>
                </div>

                <div className="popular-tags">
                  <span>Plumbing</span>
                  <span>Electrical</span>
                  <span>Cleaning</span>
                  <span>AC Repair</span>
                </div>

                <div className="hero-badge">
                  <span className="checkmark">✔</span>
                  200+ Happy Customers
                </div>
              </div>

              <aside className="hero-ad-card" aria-label="ServiceGo promo video">
                <video
                  className="hero-ad-video"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  poster="/hero-bg.png"
                >
                  <source src="/homepage-ad.mp4" type="video/mp4" />
                </video>
                <p className="hero-ad-caption">Book trusted help in minutes.</p>
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

          <div className="services-grid">
            
            {loading ? (
              <p>Loading services...</p>
            ) : servicesError ? (
              <p>{servicesError}</p>
            ) : filteredServices.length === 0 ? (
              <p>No services available.</p>
            ) : (
              filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="service-card animate-on-scroll"
                >
                  <div className="service-icon">
                    {service.icon}
                  </div>
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <button
                    className="btn-book"
                    onClick={() => startBookingFlow(service)}
                  >
                    Book Now
                  </button>
                </div>
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
            © 2026 ServiceGo. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}