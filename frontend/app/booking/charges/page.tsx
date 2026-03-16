"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { isVendorUser } from "@/lib/user-role";
import {
  formatPrice,
  getServiceBlueprint,
  mergeBookingDraft,
  readBookingDraft,
  type BookingAddon,
  type BookingPackage,
  type ServiceItem,
} from "@/lib/booking-flow";

type TimeSlotOption = {
  value: string;
  label: string;
};

const SLOT_INTERVAL_MINUTES = 30;
const SLOT_OPTION_COUNT = 8;

function formatSlotLabel(slotTime: Date, now: Date) {
  const isToday = slotTime.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = slotTime.toDateString() === tomorrow.toDateString();
  const timeLabel = slotTime.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today, ${timeLabel}`;
  }

  if (isTomorrow) {
    return `Tomorrow, ${timeLabel}`;
  }

  const dateLabel = slotTime.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

  return `${dateLabel}, ${timeLabel}`;
}

function buildTimeSlotOptions(now: Date): TimeSlotOption[] {
  const slots: TimeSlotOption[] = [{
    value: "just-now",
    label: "Just now (assign ASAP)",
  }];

  const cursor = new Date(now);
  cursor.setSeconds(0, 0);

  const minuteRemainder = cursor.getMinutes() % SLOT_INTERVAL_MINUTES;
  if (minuteRemainder !== 0) {
    cursor.setMinutes(cursor.getMinutes() + (SLOT_INTERVAL_MINUTES - minuteRemainder));
  }

  if (cursor <= now) {
    cursor.setMinutes(cursor.getMinutes() + SLOT_INTERVAL_MINUTES);
  }

  for (let index = 0; index < SLOT_OPTION_COUNT; index += 1) {
    const slotTime = new Date(cursor);
    slots.push({
      value: slotTime.toISOString(),
      label: formatSlotLabel(slotTime, now),
    });
    cursor.setMinutes(cursor.getMinutes() + SLOT_INTERVAL_MINUTES);
  }

  return slots;
}

export default function BookingChargesPage() {
  return (
    <Suspense fallback={<BookingChargesFallback />}>
      <BookingChargesPageContent />
    </Suspense>
  );
}

function BookingChargesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authReady, setAuthReady] = useState(false);
  const [service, setService] = useState<ServiceItem | null>(null);
  const [loadingService, setLoadingService] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("just-now");
  const [slotOptions, setSlotOptions] = useState<TimeSlotOption[]>(() => buildTimeSlotOptions(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const draft = readBookingDraft();
  const serviceId = searchParams.get("serviceId") ?? draft?.serviceId ?? "";
  const currentPath = serviceId
    ? `/booking/charges?serviceId=${encodeURIComponent(serviceId)}`
    : "/booking/charges";

  useEffect(() => {
    const refreshSlots = () => {
      setSlotOptions(buildTimeSlotOptions(new Date()));
    };

    refreshSlots();
    const slotTimer = window.setInterval(refreshSlots, 60000);

    return () => {
      window.clearInterval(slotTimer);
    };
  }, []);

  useEffect(() => {
    const ensureSignedIn = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/auth/signup?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      const isVendor = await isVendorUser(user.id);
      if (isVendor) {
        router.replace("/vendor/dashboard");
        return;
      }

      setAuthReady(true);
    };

    ensureSignedIn();
  }, [currentPath, router]);

  useEffect(() => {
    const currentDraft = readBookingDraft();

    if (!currentDraft?.addressLine || !currentDraft?.locationLabel) {
      if (serviceId) {
        router.replace(`/booking/location?serviceId=${encodeURIComponent(serviceId)}`);
      } else {
        router.replace("/");
      }
      return;
    }

    if (currentDraft.customerName) {
      setCustomerName(currentDraft.customerName);
    }

    if (currentDraft.customerPhone) {
      setCustomerPhone(currentDraft.customerPhone);
    }

    if (currentDraft.preferredTime) {
      setPreferredTime(currentDraft.preferredTime);
    }
  }, [router, serviceId]);

  useEffect(() => {
    if (!slotOptions.some((slot) => slot.value === preferredTime)) {
      setPreferredTime("just-now");
    }
  }, [preferredTime, slotOptions]);

  useEffect(() => {
    const loadService = async () => {
      if (!serviceId) {
        setLoadingService(false);
        return;
      }

      try {
        const response = await fetch(apiUrl("/services"));
        if (!response.ok) {
          throw new Error(`Services API failed with ${response.status}`);
        }

        const data = await response.json();
        const matchedService = Array.isArray(data)
          ? data.find((item: ServiceItem) => String(item.id) === String(serviceId))
          : null;

        if (!matchedService) {
          throw new Error("Service not found");
        }

        const blueprint = getServiceBlueprint(matchedService.name);
        const currentDraft = readBookingDraft();

        setService(matchedService);
        setSelectedPackageId(currentDraft?.packageId ?? blueprint.packages[0]?.id ?? "");
        setSelectedAddonIds(currentDraft?.addonIds ?? []);
      } catch (error) {
        console.error("Failed to load service pricing", error);
        setErrorMessage("Unable to load packages right now. Please retry.");
      } finally {
        setLoadingService(false);
      }
    };

    loadService();
  }, [serviceId]);

  const blueprint = getServiceBlueprint(service?.name ?? "Service");
  const selectedPackage = blueprint.packages.find((item) => item.id === selectedPackageId) ?? null;
  const selectedAddons = blueprint.addons.filter((item) => selectedAddonIds.includes(item.id));
  const addonsTotal = selectedAddons.reduce((total, item) => total + item.price, 0);
  const totalPrice = (selectedPackage?.price ?? 0) + addonsTotal;

  const toggleAddon = (addonId: string) => {
    setSelectedAddonIds((currentAddons) =>
      currentAddons.includes(addonId)
        ? currentAddons.filter((item) => item !== addonId)
        : [...currentAddons, addonId]
    );
  };

  const handleBooking = async () => {
    if (!service || !selectedPackage) {
      setErrorMessage("Choose a package to continue.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace(`/auth/signup?next=${encodeURIComponent(currentPath)}`);
      return;
    }

    const latestDraft = readBookingDraft();
    const bookingAddress = [
      latestDraft?.addressLine,
      latestDraft?.locationLabel,
      typeof latestDraft?.latitude === "number" && typeof latestDraft?.longitude === "number"
        ? `Coordinates: ${latestDraft.latitude}, ${latestDraft.longitude}`
        : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const addonNames = selectedAddons.map((item) => item.name);
    const preferredTimestamp = preferredTime === "just-now"
      ? new Date().toISOString()
      : preferredTime;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(apiUrl("/booking"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: service.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          address: bookingAddress,
          preferred_time: preferredTimestamp,
          user_id: session.user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Booking failed. Please try again.");
      }

      const bookingId = String(data?.booking?.id ?? "");
      if (!bookingId) {
        throw new Error("Booking was created but no booking id was returned.");
      }

      mergeBookingDraft({
        serviceId: String(service.id),
        serviceName: service.name,
        serviceDescription: service.description,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        packagePrice: selectedPackage.price,
        addonIds: selectedAddonIds,
        addonNames,
        addonTotal: addonsTotal,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        preferredTime,
        bookingId,
      });

      router.push(`/booking/status?bookingId=${encodeURIComponent(bookingId)}`);
    } catch (error) {
      console.error("Failed to create booking", error);
      setErrorMessage(error instanceof Error ? error.message : "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="booking-shell">
      <section className="booking-panel booking-panel--wide">
        <div className="booking-stage">Step 2 of 3</div>
        <h1 className="booking-title">Choose pricing and sub-services</h1>
        <p className="booking-subtitle">
          {blueprint.headline} {service ? `For ${service.name}, we have tuned these options to the selected location.` : ""}
        </p>

        <div className="booking-grid booking-grid--two booking-grid--top">
          <div className="booking-card booking-card--soft">
            <div className="booking-label">Selected service</div>
            <div className="booking-service-name">
              {loadingService ? "Loading service..." : service?.name ?? "No service selected"}
            </div>
            <p className="booking-muted">{blueprint.locationHint}</p>
          </div>

          <div className="booking-card booking-card--accent">
            <div className="booking-label">Assignment estimate</div>
            <div className="booking-service-name">{blueprint.responseTime}</div>
            <p className="booking-muted booking-muted--dark">
              Our team will see this booking instantly after confirmation.
            </p>
          </div>
        </div>

        <div className="booking-section-title">Packages</div>
        <div className="booking-package-grid">
          {blueprint.packages.map((item: BookingPackage) => {
            const isSelected = item.id === selectedPackageId;

            return (
              <button
                key={item.id}
                type="button"
                className={`booking-package-card ${isSelected ? "is-selected" : ""}`}
                onClick={() => setSelectedPackageId(item.id)}
              >
                <div className="booking-package-row">
                  <div>
                    <div className="booking-package-name">{item.name}</div>
                    <div className="booking-package-eta">{item.eta}</div>
                  </div>
                  {item.badge ? <span className="booking-badge">{item.badge}</span> : null}
                </div>
                <div className="booking-price">{formatPrice(item.price)}</div>
                <p className="booking-muted">{item.description}</p>
                <ul className="booking-bullets">
                  {item.includes.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="booking-section-title">More sub-services</div>
        <div className="booking-addon-grid">
          {blueprint.addons.map((item: BookingAddon) => {
            const isSelected = selectedAddonIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                className={`booking-addon-card ${isSelected ? "is-selected" : ""}`}
                onClick={() => toggleAddon(item.id)}
              >
                <div>
                  <div className="booking-addon-name">{item.name}</div>
                  <p className="booking-muted">{item.description}</p>
                </div>
                <div className="booking-addon-price">+ {formatPrice(item.price)}</div>
              </button>
            );
          })}
        </div>

        <div className="booking-grid booking-grid--two booking-grid--top">
          <div className="booking-form-card">
            <label className="booking-field">
              <span>Your name</span>
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Enter your full name" />
            </label>

            <label className="booking-field">
              <span>Phone number</span>
              <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Enter your phone number" />
            </label>

            <label className="booking-field">
              <span>Preferred slot</span>
              <select value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)}>
                {slotOptions.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>

            {errorMessage ? <p className="booking-error">{errorMessage}</p> : null}
          </div>

          <div className="booking-summary-card">
            <div className="booking-label">Booking summary</div>
            <div className="booking-summary-row">
              <span>Package</span>
              <strong>{selectedPackage ? formatPrice(selectedPackage.price) : formatPrice(0)}</strong>
            </div>
            <div className="booking-summary-row">
              <span>Add-ons</span>
              <strong>{formatPrice(addonsTotal)}</strong>
            </div>
            <div className="booking-summary-row booking-summary-row--total">
              <span>Total</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>

            <div className="booking-summary-note">
              You will be moved to a live waiting screen after confirmation. When your team assigns a vendor, this status screen updates automatically.
            </div>

            <div className="booking-actions booking-actions--stack">
              <button className="booking-ghost-btn" type="button" onClick={() => router.push(`/booking/location?serviceId=${encodeURIComponent(serviceId)}`)}>
                Back to location
              </button>
              <button
                className="booking-primary-btn"
                type="button"
                disabled={submitting || !authReady || !selectedPackage || !customerName.trim() || !customerPhone.trim()}
                onClick={handleBooking}
              >
                {submitting ? "Confirming booking..." : "Confirm and wait for vendor"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function BookingChargesFallback() {
  return (
    <main className="booking-shell booking-shell--status">
      <section className="booking-panel booking-panel--status">
        <p>Loading pricing step...</p>
      </section>
    </main>
  );
}