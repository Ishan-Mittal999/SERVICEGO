"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { isVendorUser } from "@/lib/user-role";
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
  assigned_serviceman_name?: string;
  assigned_serviceman_phone?: string;
  assigned_serviceman_photo?: string;
  live_update_message?: string;
  live_update_eta?: string;
  customer_rating?: number | null;
  customer_review?: string | null;
  customer_rated_at?: string | null;
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
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);

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

      const isVendor = await isVendorUser(user.id);
      if (isVendor) {
        router.replace("/vendor/dashboard");
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

  useEffect(() => {
    if (booking?.status !== "completed") {
      return;
    }

    if (typeof booking.customer_rating === "number") {
      setRatingValue(Math.max(1, Math.min(5, Math.round(booking.customer_rating))));
    }

    setRatingReview(booking.customer_review || "");
  }, [booking]);

  const handleSubmitRating = async () => {
    if (!bookingId || booking?.status !== "completed") {
      return;
    }

    setRatingSubmitting(true);
    setRatingMessage(null);

    try {
      const response = await fetch(apiUrl(`/booking/${bookingId}/rating`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          rating: ratingValue,
          review: ratingReview,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to save rating.");
      }

      setBooking(data.booking);
      setRatingMessage("Thanks. Your rating has been saved.");
    } catch (error) {
      setRatingMessage(error instanceof Error ? error.message : "Unable to save rating.");
    } finally {
      setRatingSubmitting(false);
    }
  };

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
            ? "Booking confirmed and team assigned"
            : booking?.status === "completed"
              ? "Service completed"
              : "Booking created successfully"}
        </h1>
        <p className="booking-subtitle">
          {booking?.status === "assigned"
            ? "Your booking is confirmed. Your assigned serviceman details are available below."
            : booking?.status === "completed"
              ? "This booking is marked as completed."
              : "Your booking has been created. Live serviceman updates will appear here automatically."}
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
                  ? "Team assigned"
                  : booking?.status === "completed"
                    ? "Service complete"
                    : "Booking created"}
              </div>
              <div className="booking-service-name">{booking?.services?.name ?? draft?.serviceName ?? "Service booking"}</div>
              <p className="booking-muted">
                {booking?.status === "assigned"
                  ? "Your serviceman is now assigned. You can track the latest update below."
                  : "Your request is confirmed. We will post live serviceman details on this screen."}
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

              <div className="booking-vendor-card">
                <div className="booking-label">Live team updates</div>
                {booking?.status === "assigned" || booking?.status === "completed" ? (
                  <>
                    <div className="booking-service-name">
                      {booking.assigned_serviceman_name || booking?.vendors?.name || "Serviceman assigned"}
                    </div>
                    {booking.assigned_serviceman_photo ? (
                      <img
                        src={booking.assigned_serviceman_photo}
                        alt="Assigned serviceman"
                        style={{ width: "100%", maxWidth: 180, borderRadius: 10, border: "1px solid #EDEBE4", margin: "8px 0" }}
                      />
                    ) : null}
                    {booking.assigned_serviceman_phone || booking?.vendors?.phone ? (
                      <p className="booking-muted">Phone: {booking.assigned_serviceman_phone || booking?.vendors?.phone}</p>
                    ) : null}
                    {booking.live_update_eta ? <p className="booking-muted">ETA: {booking.live_update_eta}</p> : null}
                    {booking.live_update_message ? (
                      <p className="booking-muted">Update: {booking.live_update_message}</p>
                    ) : (
                      <p className="booking-muted">Your serviceman is assigned. Arrival updates will appear here.</p>
                    )}
                  </>
                ) : (
                  <p className="booking-muted">
                    Booking is confirmed. Serviceman name, phone, photo, and arrival updates will appear here as soon as assignment starts.
                  </p>
                )}
              </div>

              {booking?.vendors && (booking.status === "assigned" || booking.status === "completed") ? (
                <div className="booking-vendor-card">
                  <div className="booking-label">Assigned vendor</div>
                  <div className="booking-service-name">{booking.vendors.name ?? "Vendor assigned"}</div>
                  {booking.vendors.phone ? <p className="booking-muted">Phone: {booking.vendors.phone}</p> : null}
                  {booking.vendors.email ? <p className="booking-muted">Email: {booking.vendors.email}</p> : null}
                  {booking.vendors.area ? <p className="booking-muted">Area: {booking.vendors.area}</p> : null}
                </div>
              ) : null}

              {booking?.status === "completed" ? (
                <div className="booking-rating-card">
                  <div className="booking-label">Rate this shop</div>
                  <p className="booking-muted" style={{ marginBottom: "0.8rem" }}>
                    Tell us how the completed service went.
                  </p>

                  <div className="booking-rating-stars" role="radiogroup" aria-label="Shop rating">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`booking-rating-star ${value <= ratingValue ? "is-selected" : ""}`}
                        onClick={() => setRatingValue(value)}
                        aria-checked={ratingValue === value}
                        aria-label={`${value} star${value > 1 ? "s" : ""}`}
                        role="radio"
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <label className="booking-rating-label" htmlFor="booking-rating-review">
                    Optional feedback
                  </label>
                  <textarea
                    id="booking-rating-review"
                    className="booking-rating-textarea"
                    value={ratingReview}
                    onChange={(event) => setRatingReview(event.target.value)}
                    placeholder="What went well?"
                    rows={3}
                    maxLength={500}
                  />

                  <div className="booking-actions booking-actions--stack" style={{ marginTop: "0.9rem" }}>
                    <button className="booking-primary-btn" type="button" onClick={handleSubmitRating} disabled={ratingSubmitting}>
                      {ratingSubmitting ? "Saving rating..." : "Submit rating"}
                    </button>
                  </div>

                  {ratingMessage ? <p className="booking-rating-success">{ratingMessage}</p> : null}
                </div>
              ) : null}

              <div className="booking-actions booking-actions--stack">
                <button className="booking-secondary-btn" type="button" onClick={() => window.location.reload()}>
                  Check latest update
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