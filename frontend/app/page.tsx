"use client";

import { useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";


export default function HomePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedService, setSelectedService] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // ✅ CALL CUSTOM HOOK HERE
  useScrollReveal(services);

  const openBookingModal = (service: any) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  /* ================= FETCH SERVICES ================= */
  useEffect(() => {
    
    const fetchServices = async () => {
      try {
        const res = await fetch("http://localhost:5000/services");
        const data = await res.json();
        setServices(data);
      } catch (err) {
        console.error("Failed to fetch services", err);
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

    

    const counters = document.querySelectorAll(".trust-number");

    counters.forEach((counter: any) => {
      const target = parseInt(counter.getAttribute("data-count"));
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

  const filteredServices = services.filter((service: any) =>
  service.name.toLowerCase().includes(searchTerm.toLowerCase())
);
console.log("Filtered:", filteredServices);
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
            ) : filteredServices.length === 0 ? (
              <p>No services available.</p>
            ) : (
              filteredServices.map((service: any) => (
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
                    onClick={async () => {
                     const { data } = await supabase.auth.getSession();
                  
                     if (!data.session) {
                       router.push("/auth/signup");
                       return;
                     }
                  
                     openBookingModal(service);
                }}
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
            Simple 3-step process to get your service done
          </p>

          <div className="steps-flow">
            {[
              {
                icon: "📝",
                title: "Book Service",
                desc: "Select your service and schedule in seconds.",
              },
              {
                icon: "👷",
                title: "Vendor Assigned",
                desc: "We assign a verified professional instantly.",
              },
              {
                icon: "✅",
                title: "Work Completed",
                desc: "Service delivered with quality guarantee.",
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

      {/* BOOKING MODAL */}
      {isModalOpen && (
        <div
  className="modal-overlay"
  onClick={closeModal}
>
  <div
    className="modal-container"
    onClick={(e) => e.stopPropagation()}
  >
    <button
      className="modal-close"
      onClick={closeModal}
    >
      ✕
    </button>
            <h3>
              Book {selectedService?.name}
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);

//                 const formData = new FormData(e.currentTarget);

//                 // 🔹 GET LOGGED-IN USER
//                 // const { data: userData } = await supabase.auth.getUser();

// //                   temporaray
//                 const { data } = await supabase.auth.getSession();
//                 console.log("SESSION:", data);
// //                   temporary


//                 const bookingData = {
//                   service_id:selectedService?.id,
//                   customer_name:formData.get("name"),
//                   customer_phone:formData.get("phone"),
//                   address:formData.get("address"),
//                     user_id: data.session?.user?.id,
//                   // user_id: userData.user?.id,
//                 };



                const formData = new FormData(e.currentTarget);

                const { data } = await supabase.auth.getSession();
                const userId = data.session?.user?.id;

                console.log("USER ID:", userId);

                const bookingData = {
                  service_id: selectedService?.id,
                  customer_name: formData.get("name"),
                  customer_phone: formData.get("phone"),
                  address: formData.get("address"),
                  user_id: userId,
};

                try {
                  const response =
                    await fetch(
                      "http://localhost:5000/booking",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type":
                            "application/json",
                        },
                        body: JSON.stringify(
                          bookingData
                        ),
                      }
                    );

                  if (!response.ok) {
                    alert(
                      "Booking failed. Try again."
                    );
                    return;
                  }

                  alert(
                    "Booking created successfully!"
                  );
                  closeModal();
                } catch (err) {
                  alert(
                    "Server error. Please try again."
                  );
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <input
                name="name"
                placeholder="Your Name"
                required
              />
              <input
                name="phone"
                placeholder="Phone Number"
                required
              />
              <input
                name="address"
                placeholder="Address"
                required
              />
              <button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Booking..."
                  : "Confirm Booking"}
              </button>
            </form>

            
          </div>
        </div>
      )}

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