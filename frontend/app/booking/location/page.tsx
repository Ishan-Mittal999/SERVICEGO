"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiUrl } from "@/lib/env";
import {
  mergeBookingDraft,
  readBookingDraft,
  type ServiceItem,
} from "@/lib/booking-flow";

export default function BookingLocationPage() {
  return (
    <Suspense fallback={<BookingPageFallback label="Loading location step..." />}>
      <BookingLocationPageContent />
    </Suspense>
  );
}

function BookingLocationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authReady, setAuthReady] = useState(false);
  const [service, setService] = useState<ServiceItem | null>(null);
  const [loadingService, setLoadingService] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [addressLine, setAddressLine] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const serviceId = searchParams.get("serviceId") ?? readBookingDraft()?.serviceId ?? "";
  const currentPath = serviceId
    ? `/booking/location?serviceId=${encodeURIComponent(serviceId)}`
    : "/booking/location";

  useEffect(() => {
    const ensureSignedIn = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/auth/signup?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      setAuthReady(true);
    };

    ensureSignedIn();
  }, [currentPath, router]);

  useEffect(() => {
    const draft = readBookingDraft();

    if (draft?.addressLine) {
      setAddressLine(draft.addressLine);
    }

    if (draft?.locationLabel) {
      setLocationLabel(draft.locationLabel);
    }

    if (typeof draft?.latitude === "number") {
      setLatitude(draft.latitude);
    }

    if (typeof draft?.longitude === "number") {
      setLongitude(draft.longitude);
    }
  }, []);

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

        setService(matchedService);
        mergeBookingDraft({
          serviceId: String(matchedService.id),
          serviceName: matchedService.name,
          serviceDescription: matchedService.description,
        });
      } catch (error) {
        console.error("Failed to load selected service", error);
      } finally {
        setLoadingService(false);
      }
    };

    loadService();
  }, [serviceId]);

  const requestCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not available in this browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = Number(position.coords.latitude.toFixed(6));
        const nextLongitude = Number(position.coords.longitude.toFixed(6));

        setLatitude(nextLatitude);
        setLongitude(nextLongitude);
        setLocationDenied(false);
        setLocationError(null);

        if (!locationLabel) {
          setLocationLabel(`Current location (${nextLatitude}, ${nextLongitude})`);
        }

        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationDenied(true);
          setLocationError(null);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("Location information is unavailable. Enter your address manually below.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location request timed out. Enter your address manually or try again.");
        } else {
          setLocationError("Could not fetch your current location. Enter your address manually below.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }, [locationLabel]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (latitude || longitude) {
      return;
    }

    // Only auto-request location on page load; never re-auto-trigger after user denies.
    if (!locationDenied) {
      requestCurrentLocation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const handleContinue = () => {
    if (!service) {
      return;
    }

    mergeBookingDraft({
      serviceId: String(service.id),
      serviceName: service.name,
      serviceDescription: service.description,
      locationLabel: locationLabel.trim(),
      addressLine: addressLine.trim(),
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
    });

    router.push(`/booking/charges?serviceId=${encodeURIComponent(String(service.id))}`);
  };

  const canContinue = Boolean(service && addressLine.trim() && locationLabel.trim());

  return (
    <main className="booking-shell">
      <section className="booking-panel booking-panel--wide">
        <div className="booking-stage">Step 1 of 3</div>
        <h1 className="booking-title">Confirm your service location</h1>
        <p className="booking-subtitle">
          We use your location to show the right pricing, available sub-services, and nearby vendors.
        </p>

        <div className="booking-grid booking-grid--two">
          <div className="booking-card booking-card--soft">
            <div className="booking-label">Selected service</div>
            <div className="booking-service-name">
              {loadingService ? "Loading service..." : service?.name ?? "No service selected"}
            </div>
            <p className="booking-muted">
              {service?.description ?? "Pick a service from the home page to start a booking."}
            </p>
          </div>

          <div className="booking-card booking-card--accent">
            <div className="booking-label">Live location status</div>
            <div className="booking-location-pill">
              {isLocating
                ? "Fetching current location..."
                : latitude && longitude
                  ? "Location captured"
                  : locationDenied
                    ? "Location access denied"
                    : "Waiting for permission"}
            </div>
            {locationDenied ? (
              <p className="booking-muted booking-muted--dark">
                You denied location access. That is okay — just type your full address in the form below and continue.
              </p>
            ) : (
              <p className="booking-muted booking-muted--dark">
                {latitude && longitude
                  ? `Coordinates captured: ${latitude}, ${longitude}`
                  : "Allow location access for faster pricing and vendor matching."}
              </p>
            )}
            {!locationDenied && (
              <button className="booking-secondary-btn" onClick={requestCurrentLocation} type="button" disabled={isLocating}>
                {isLocating ? "Fetching..." : "Fetch Current Location"}
              </button>
            )}
          </div>
        </div>

        <div className="booking-form-card">
          <label className="booking-field">
            <span>Location label</span>
            <input
              value={locationLabel}
              onChange={(event) => setLocationLabel(event.target.value)}
              placeholder="Current location, Home, Office, Society gate"
            />
          </label>

          <label className="booking-field">
            <span>Full address</span>
            <textarea
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="Flat, street, landmark, city"
              rows={4}
            />
          </label>

          {locationError ? (
            <p className="booking-error">{locationError}</p>
          ) : locationDenied ? (
            <p className="booking-error">
              Location permission was denied. Enter your full address in the fields above to continue without GPS coordinates.
            </p>
          ) : null}

          <div className="booking-actions">
            <button className="booking-ghost-btn" type="button" onClick={() => router.push("/")}>Back</button>
            <button className="booking-primary-btn" type="button" disabled={!canContinue} onClick={handleContinue}>
              Continue to pricing
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function BookingPageFallback({ label }: { label: string }) {
  return (
    <main className="booking-shell booking-shell--status">
      <section className="booking-panel booking-panel--status">
        <p>{label}</p>
      </section>
    </main>
  );
}