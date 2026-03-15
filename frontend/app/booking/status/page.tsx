"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import {
  clearBookingDraft,
  formatPrice,
  readBookingDraft,
} from "@/lib/booking-flow";

type BookingResponse = {
  id: string | number;
  status: "pending" | "assigned" | "completed";
  user_id?: string;
  customer_name?: string;
  customer_phone?: string;
  address?: string;
  preferred_time?: string;
  services?: {
    name?: string;
    description?: string;
  } | null;
  vendors?: {
    name?: string;
    phone?: string;
    email?: string;
    area?: string;
  } | null;
};

export default function BookingStatusPage() {
  return (
    <Suspense fallback={<BookingStatusFallback />}>
      <BookingStatusPageContent />
    </Suspense>
  );
}

function BookingStatusPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const draft = readBookingDraft();
  const bookingId = searchParams.get("bookingId") ?? draft?.bookingId ?? "";
  const currentPath = bookingId
    ? `/booking/status?bookingId=${encodeURIComponent(bookingId)}`
    : "/booking/status";

  useEffect(() => {
    const ensureSignedIn = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/auth/signup?next=${encodeURIComponent(currentPath)}`);
        return;
      }

      setUserId(user.id);
      setAuthReady(true);
    };

    ensureSignedIn();
  }, [currentPath, router]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    if (!bookingId) {
      router.replace("/");
      return;
    }

    let isActive = true;

    const loadBooking = async () => {
      try {
        const response = await fetch(apiUrl(`/booking/${bookingId}`), {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load booking status.");
        }

        if (data?.user_id && userId && data.user_id !== userId) {
          throw new Error("This booking does not belong to the current user.");
        }

        if (!isActive) {
          return;
        }

        setBooking(data);
        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to fetch booking status", error);
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load booking status.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadBooking();
    const poller = window.setInterval(loadBooking, 5000);

    return () => {
      isActive = false;
      window.clearInterval(poller);
    };
  }, [authReady, bookingId, router, userId]);

  const packageTotal = (draft?.packagePrice ?? 0) + (draft?.addonTotal ?? 0);

  const handleReset = () => {
    clearBookingDraft();
    router.push("/");
  };

  return (
    <main className="booking-shell booking-shell--status">
      <section className="booking-panel booking-panel--status">
        <div className="booking-stage">Step 3 of 3</div>
        <h1 className="booking-title">
          {booking?.status === "assigned"
            ? "Vendor assigned"
            : booking?.status === "completed"
              ? "Service completed"
              : "Waiting for vendor assignment"}
        </h1>
        <p className="booking-subtitle">
          {booking?.status === "assigned"
            ? "Your team has assigned a vendor. All the booking details are ready below."
            : booking?.status === "completed"
              ? "This booking is marked as completed."
              : "Your request is live. This screen refreshes automatically until a vendor is assigned."}
        </p>

        {errorMessage ? <p className="booking-error">{errorMessage}</p> : null}

        {loading ? (
          <div className="booking-waiting-card">
            <div className="booking-spinner" />
            <div className="booking-service-name">Loading your booking...</div>
          </div>
        ) : (
          <div className="booking-grid booking-grid--two booking-grid--top">
            <div className="booking-waiting-card">
              <div className="booking-wave">
                <span />
                <span />
                <span />
              </div>
              <div className="booking-status-chip booking-status-chip--active">
                {booking?.status === "assigned"
                  ? "Vendor locked in"
                  : booking?.status === "completed"
                    ? "Service complete"
                    : "Searching nearby vendors"}
              </div>
              <div className="booking-service-name">{booking?.services?.name ?? draft?.serviceName ?? "Service booking"}</div>
              <p className="booking-muted">
                {booking?.status === "assigned"
                  ? "You can now see the assigned vendor and reach out if needed."
                  : "Please keep this screen open while your team matches the best vendor."}
              </p>

              <div className="booking-checkpoints">
                <div className="booking-checkpoint is-complete">Booking created</div>
                <div className={`booking-checkpoint ${booking?.status === "assigned" || booking?.status === "completed" ? "is-complete" : "is-current"}`}>
                  Vendor assigned
                </div>
                <div className={`booking-checkpoint ${booking?.status === "completed" ? "is-complete" : ""}`}>
                  Service completion
                </div>
              </div>
            </div>

            <div className="booking-summary-card booking-summary-card--status">
              <div className="booking-label">Booking details</div>
              <div className="booking-summary-row">
                <span>Customer</span>
                <strong>{booking?.customer_name ?? draft?.customerName ?? "-"}</strong>
              </div>
              <div className="booking-summary-row">
                <span>Phone</span>
                <strong>{booking?.customer_phone ?? draft?.customerPhone ?? "-"}</strong>
              </div>
              <div className="booking-summary-row">
                <span>Package</span>
                <strong>{draft?.packageName ?? "Standard package"}</strong>
              </div>
              <div className="booking-summary-row">
                <span>Estimated charges</span>
                <strong>{formatPrice(packageTotal)}</strong>
              </div>
              <div className="booking-summary-row">
                <span>Address</span>
                <strong className="booking-multiline">{booking?.address ?? draft?.addressLine ?? "-"}</strong>
              </div>

              {draft?.addonNames?.length ? (
                <div className="booking-summary-note">
                  Add-ons: {draft.addonNames.join(", ")}
                </div>
              ) : null}

              {booking?.vendors && (booking.status === "assigned" || booking.status === "completed") ? (
                <div className="booking-vendor-card">
                  <div className="booking-label">Assigned vendor</div>
                  <div className="booking-service-name">{booking.vendors.name ?? "Vendor assigned"}</div>
                  {booking.vendors.phone ? <p className="booking-muted">Phone: {booking.vendors.phone}</p> : null}
                  {booking.vendors.email ? <p className="booking-muted">Email: {booking.vendors.email}</p> : null}
                  {booking.vendors.area ? <p className="booking-muted">Area: {booking.vendors.area}</p> : null}
                </div>
              ) : null}

              <div className="booking-actions booking-actions--stack">
                <button className="booking-secondary-btn" type="button" onClick={() => window.location.reload()}>
                  Refresh status
                </button>
                <button className="booking-primary-btn" type="button" onClick={handleReset}>
                  Book another service
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function BookingStatusFallback() {
  return (
    <main className="booking-shell booking-shell--status">
      <section className="booking-panel booking-panel--status">
        <p>Loading booking status...</p>
      </section>
    </main>
  );
}