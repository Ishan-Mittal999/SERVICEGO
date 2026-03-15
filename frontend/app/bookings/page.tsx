"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";

type UserBooking = {
  id: string | number;
  user_id?: string;
  status?: "pending" | "assigned" | "completed";
  customer_name?: string;
  customer_phone?: string;
  address?: string;
  preferred_time?: string;
  created_at?: string;
  services?: {
    name?: string;
    description?: string;
  } | null;
  vendors?: {
    name?: string;
    phone?: string;
    area?: string;
  } | null;
};

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatus(status?: string) {
  if (!status) {
    return "Pending";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

async function parseJsonSafely(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const text = await response.text();
    throw new Error(
      text.startsWith("<!DOCTYPE")
        ? "Backend returned HTML instead of JSON. Please redeploy backend on Render and refresh."
        : "Unexpected API response format."
    );
  }

  return response.json();
}

export default function MyBookingsPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace(`/auth/login?next=${encodeURIComponent("/bookings")}`);
          return;
        }

        setAuthReady(true);

        const userBookingsResponse = await fetch(apiUrl(`/bookings/user/${user.id}`), {
          cache: "no-store",
        });

        if (userBookingsResponse.ok) {
          const userBookingsData = await parseJsonSafely(userBookingsResponse);
          setBookings(Array.isArray(userBookingsData) ? userBookingsData : []);
          setErrorMessage(null);
          return;
        }

        // Fallback for older backend deployments where /bookings/user/:userId is not available yet.
        const allBookingsResponse = await fetch(apiUrl("/bookings"), {
          cache: "no-store",
        });
        const allBookingsData = await parseJsonSafely(allBookingsResponse);

        if (!allBookingsResponse.ok) {
          throw new Error(allBookingsData?.error || "Unable to load your bookings.");
        }

        const filteredBookings = Array.isArray(allBookingsData)
          ? allBookingsData.filter((booking: UserBooking) => booking.user_id === user.id)
          : [];

        setBookings(filteredBookings);
        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to load user bookings", error);
        setBookings([]);
        setErrorMessage(error instanceof Error ? error.message : "Unable to load your bookings.");
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [reloadKey, router]);

  const pendingCount = useMemo(
    () => bookings.filter((booking) => booking.status === "pending").length,
    [bookings]
  );

  return (
    <main className="booking-shell booking-shell--status">
      <section className="booking-panel booking-panel--status">
        <div className="booking-stage">My account</div>
        <h1 className="booking-title">Your booked services</h1>
        <p className="booking-subtitle">
          Track every booking in one place. Open a booking to check live assignment status.
        </p>

        <div className="booking-grid booking-grid--two booking-grid--top">
          <div className="booking-card booking-card--soft">
            <div className="booking-label">Total bookings</div>
            <div className="booking-service-name">{bookings.length}</div>
            <p className="booking-muted">Includes pending, assigned, and completed bookings.</p>
          </div>

          <div className="booking-card booking-card--accent">
            <div className="booking-label">Pending right now</div>
            <div className="booking-service-name">{pendingCount}</div>
            <p className="booking-muted booking-muted--dark">These are waiting for vendor assignment.</p>
          </div>
        </div>

        {loading || !authReady ? (
          <div className="booking-waiting-card">
            <div className="booking-spinner" />
            <div className="booking-service-name">Loading your bookings...</div>
          </div>
        ) : errorMessage ? (
          <div className="booking-summary-card booking-summary-card--status">
            <div className="booking-label">Unable to fetch bookings</div>
            <p className="booking-muted">{errorMessage}</p>
            <div className="booking-actions">
              <button className="booking-primary-btn" type="button" onClick={() => setReloadKey((key) => key + 1)}>
                Retry
              </button>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="booking-summary-card booking-summary-card--status">
            <div className="booking-label">No bookings yet</div>
            <p className="booking-muted">You have not placed any booking. Start from the home page and choose a service.</p>
            <div className="booking-actions">
              <button className="booking-primary-btn" type="button" onClick={() => router.push("/")}>Book a service</button>
            </div>
          </div>
        ) : (
          <div className="booking-package-grid">
            {bookings.map((booking) => (
              <article key={String(booking.id)} className="booking-package-card">
                <div className="booking-package-row">
                  <div>
                    <div className="booking-package-name">{booking.services?.name ?? "Service booking"}</div>
                    <div className="booking-package-eta">Booking ID: {booking.id}</div>
                  </div>
                  <span className="booking-badge">{formatStatus(booking.status)}</span>
                </div>

                <div className="booking-summary-row">
                  <span>Created</span>
                  <strong>{formatDateTime(booking.created_at)}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Preferred slot</span>
                  <strong>{formatDateTime(booking.preferred_time)}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Customer</span>
                  <strong>{booking.customer_name ?? "-"}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Phone</span>
                  <strong>{booking.customer_phone ?? "-"}</strong>
                </div>
                <div className="booking-summary-row">
                  <span>Address</span>
                  <strong className="booking-multiline">{booking.address ?? "-"}</strong>
                </div>

                {booking.vendors?.name ? (
                  <p className="booking-summary-note">Assigned vendor: {booking.vendors.name}</p>
                ) : null}

                <div className="booking-actions booking-actions--stack">
                  <button
                    className="booking-secondary-btn"
                    type="button"
                    onClick={() => router.push(`/booking/status?bookingId=${encodeURIComponent(String(booking.id))}`)}
                  >
                    View live status
                  </button>
                  <button className="booking-ghost-btn" type="button" onClick={() => router.push("/")}>
                    Book again
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
