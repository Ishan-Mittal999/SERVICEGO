"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { isValidIndianMobile, normalizeIndianPhone, sanitizeIndianPhoneInput } from "@/lib/phone";
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

function getInitials(value: string) {
  const words = value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("") || "SV";
}
function getServiceVisual(serviceName: string, fallbackIcon?: string) {
  const normalizedName = serviceName.toLowerCase();

  if (normalizedName.includes("plumb")) {
    return { kind: "plumbing", icon: fallbackIcon || "🔧", label: "Pipe care" };
  }
  if (normalizedName.includes("electric")) {
    return { kind: "electrical", icon: fallbackIcon || "⚡", label: "Power fix" };
  }

  if (normalizedName.includes("clean")) {
    return { kind: "cleaning", icon: fallbackIcon || "🧹", label: "Deep clean" };
  }

  if (normalizedName.includes("ac") || normalizedName.includes("air")) {
    return { kind: "ac", icon: fallbackIcon || "❄️", label: "Cool care" };
  }

  return { kind: "default", icon: fallbackIcon || "🛠️", label: getInitials(serviceName) };
}

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
      setCustomerPhone(normalizeIndianPhone(currentDraft.customerPhone));
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

        const dataRaw = await response.json();
        // Support both array and paginated object formats
        const data = dataRaw.data || (Array.isArray(dataRaw) ? dataRaw : []);
        const matchedService = data.find((item: ServiceItem) => String(item.id) === String(serviceId)) || null;

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
  const selectedSlotLabel = slotOptions.find((slot) => slot.value === preferredTime)?.label ?? "Just now (assign ASAP)";
  const serviceVisual = getServiceVisual(service?.name ?? "Service", service?.icon);
  const normalizedCustomerPhone = normalizeIndianPhone(customerPhone);
  const isCustomerPhoneValid = isValidIndianMobile(normalizedCustomerPhone);

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

    if (!isCustomerPhoneValid) {
      setErrorMessage("Enter a valid 10-digit mobile number.");
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
          customer_phone: normalizedCustomerPhone,
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
        customerPhone: normalizedCustomerPhone,
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
    <main className="booking-shell booking-shell--ride">
      <section className="booking-ride-layout">
        <div className="booking-ride-sheet">
          <div className="booking-ride-topbar booking-ride-topbar--sheet">
            <button
              className="booking-map-nav"
              type="button"
              onClick={() => router.push(`/booking/location?serviceId=${encodeURIComponent(serviceId)}`)}
            >
              Back
            </button>
            <div className="booking-stage">Step 2 of 3</div>
          </div>

          <div className="booking-ride-sheet-header">
            <div>
              <p className="booking-sheet-kicker">Choose pricing and sub-services</p>
              <h1 className="booking-sheet-title">Pick the best service tier</h1>
              <p className="booking-sheet-copy">
                {blueprint.headline} {service ? `These options are adjusted for ${service.name.toLowerCase()} at your selected location.` : ""}
              </p>
            </div>

            <div className="booking-sheet-total">
              <span>Estimated total</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>
          </div>

          <div className="booking-route-preview booking-route-preview--inline">
            <div className={`booking-route-service-mark booking-route-service-mark--${serviceVisual.kind}`}>
              <span className="booking-thumbnail-emoji">{serviceVisual.icon}</span>
            </div>
            <div className="booking-route-copy">
              <div className="booking-route-title">{loadingService ? "Loading service..." : service?.name ?? "No service selected"}</div>
              <div className="booking-route-subtitle">{blueprint.locationHint}</div>
            </div>
            <div className="booking-route-time">{blueprint.responseTime}</div>
          </div>

          <div className="booking-option-list">
            {blueprint.packages.map((item: BookingPackage) => {
              const isSelected = item.id === selectedPackageId;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`booking-option-card ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSelectedPackageId(item.id)}
                >
                  <div className={`booking-option-icon booking-option-icon--${serviceVisual.kind}`}>
                    <span className="booking-thumbnail-emoji">{serviceVisual.icon}</span>
                    <span className="booking-thumbnail-label">{item.badge ?? serviceVisual.label}</span>
                  </div>

                  <div className="booking-option-copy">
                    <div className="booking-option-headline-row">
                      <div>
                        <div className="booking-option-name">{item.name}</div>
                        <div className="booking-option-meta">{item.eta}</div>
                      </div>
                      {item.badge ? <span className="booking-badge">{item.badge}</span> : null}
                    </div>

                    <p className="booking-option-description">{item.description}</p>
                    <div className="booking-option-includes">{item.includes.join(" • ")}</div>
                  </div>

                  <div className="booking-option-side">
                    <div className="booking-option-price">{formatPrice(item.price)}</div>
                    <div className="booking-option-state">{isSelected ? "Selected" : "Tap to select"}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="booking-subservice-panel">
            <div className="booking-subservice-header">
              <div>
                <div className="booking-label">Sub-services</div>
                <div className="booking-subservice-title">Add extras if needed</div>
              </div>
              <div className="booking-subservice-caption">Optional upgrades</div>
            </div>

            <div className="booking-addon-list">
              {blueprint.addons.map((item: BookingAddon) => {
                const isSelected = selectedAddonIds.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`booking-addon-pill ${isSelected ? "is-selected" : ""}`}
                    onClick={() => toggleAddon(item.id)}
                  >
                    <span className="booking-addon-pill-name">{item.name}</span>
                    <span className="booking-addon-pill-description">{item.description}</span>
                    <strong className="booking-addon-pill-price">+ {formatPrice(item.price)}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="booking-ride-detail-grid">
            <div className="booking-form-card booking-form-card--ride">
              <div className="booking-label">Contact details</div>

              <label className="booking-field">
                <span>Your name</span>
                <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Enter your full name" />
              </label>

              <label className="booking-field">
                <span>Phone number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[0-9]*"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(sanitizeIndianPhoneInput(event.target.value))}
                  placeholder="Enter your phone number"
                />
              </label>
              {customerPhone && !isCustomerPhoneValid ? (
                <p className="booking-error">Phone number must be a valid 10-digit mobile number.</p>
              ) : null}

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

            <div className="booking-summary-card booking-summary-card--ride">
              <div className="booking-label">Trip-style summary</div>
              <div className="booking-summary-service-row">
                <div className={`booking-summary-service-icon booking-summary-service-icon--${serviceVisual.kind}`}>
                  <span className="booking-thumbnail-emoji">{serviceVisual.icon}</span>
                </div>
                <div>
                  <div className="booking-summary-service-name">{selectedPackage?.name ?? "Select a package"}</div>
                  <div className="booking-summary-service-meta">{selectedSlotLabel}</div>
                </div>
              </div>

              <div className="booking-summary-row">
                <span>Base package</span>
                <strong>{selectedPackage ? formatPrice(selectedPackage.price) : formatPrice(0)}</strong>
              </div>
              <div className="booking-summary-row">
                <span>Sub-services</span>
                <strong>{formatPrice(addonsTotal)}</strong>
              </div>
              <div className="booking-summary-row booking-summary-row--total">
                <span>Total</span>
                <strong>{formatPrice(totalPrice)}</strong>
              </div>

              <div className="booking-summary-note">
                Confirm to move to the live waiting screen. Vendor assignment updates automatically after booking.
              </div>
            </div>
          </div>
        </div>

        <div className="booking-sticky-bar">
          <div>
            <div className="booking-sticky-label">To pay</div>
            <div className="booking-sticky-value">{formatPrice(totalPrice)}</div>
          </div>

          <button
            className="booking-primary-btn booking-primary-btn--sticky"
            type="button"
            disabled={submitting || !authReady || !selectedPackage || !customerName.trim() || !isCustomerPhoneValid}
            onClick={handleBooking}
          >
            {submitting ? "Confirming booking..." : `Book ${selectedPackage?.name ?? "service"}`}
          </button>
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