"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/env";
import { useRouter } from "next/navigation";
import { requireAdminOrRedirect } from "@/lib/admin-access";

type AdminBooking = {
  id: string;
  customer_name?: string;
  customer_phone?: string;
  service_id?: string | number;
  status: "pending" | "pending_admin" | "assigned" | "completed";
  services?: {
    name?: string;
  } | null;
  vendors?: {
    id?: string;
    name?: string;
    phone?: string;
  } | null;
};

type AdminVendor = {
  id: string;
  name?: string;
  phone?: string;
  service_id?: string | number;
  is_active?: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeAssignId, setActiveAssignId] = useState<string | null>(null);

  const fetchBookings = async () => {
    const res = await fetch(apiUrl("/bookings"));
    if (!res.ok) {
      throw new Error(`Bookings API failed with ${res.status}`);
    }

    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
  };

  const fetchVendors = async () => {
    const res = await fetch(apiUrl("/vendors"));
    if (!res.ok) {
      throw new Error(`Vendors API failed with ${res.status}`);
    }

    const data = await res.json();
    setVendors(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let isActive = true;
    let poller: number | undefined;

    const loadDashboard = async (showLoader = false) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setErrorMessage(null);
        const [bookingsResponse, vendorsResponse] = await Promise.all([
          fetch(apiUrl("/bookings"), { cache: "no-store" }),
          fetch(apiUrl("/vendors"), { cache: "no-store" }),
        ]);

        if (!bookingsResponse.ok) {
          throw new Error(`Bookings API failed with ${bookingsResponse.status}`);
        }

        if (!vendorsResponse.ok) {
          throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
        }

        const [bookingsData, vendorsData] = await Promise.all([
          bookingsResponse.json(),
          vendorsResponse.json(),
        ]);

        if (!isActive) {
          return;
        }

        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setVendors(Array.isArray(vendorsData) ? vendorsData : []);
      } catch (error) {
        console.error("Failed to load admin dashboard", error);
        if (isActive) {
          setErrorMessage("Could not load bookings right now. Please refresh in a moment.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    const bootstrap = async () => {
      const isAdmin = await requireAdminOrRedirect(router, "/admin");
      if (!isAdmin) {
        if (isActive) {
          setLoading(false);
        }
        return;
      }

      await loadDashboard(true);
      poller = window.setInterval(() => loadDashboard(false), 8000);
    };

    bootstrap();

    return () => {
      isActive = false;
      if (poller) {
        window.clearInterval(poller);
      }
    };
  }, [router]);

  const total = bookings.length;
  const pending = bookings.filter((booking) => booking.status === "pending").length;
  const pendingAdmin = bookings.filter((booking) => booking.status === "pending_admin").length;
  const assigned = bookings.filter((booking) => booking.status === "assigned").length;
  const completed = bookings.filter((booking) => booking.status === "completed").length;

  const filteredBookings =
    statusFilter === "all"
      ? bookings
      : bookings.filter((booking) => booking.status === statusFilter);

  const assignVendor = async (bookingId: string, vendorId: string) => {
    const response = await fetch(apiUrl(`/booking/${bookingId}/assign`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_id: vendorId }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Vendor assignment failed");
    }

    setActiveAssignId(null);
    await fetchBookings();
  };

  const unassignVendor = async (bookingId: string) => {
    const response = await fetch(apiUrl(`/booking/${bookingId}/unassign`), {
      method: "PUT",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Could not move booking back to pending");
    }

    await fetchBookings();
  };

  const completeBooking = async (bookingId: string) => {
    const response = await fetch(apiUrl(`/booking/${bookingId}/complete`), {
      method: "PUT",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Could not complete booking");
    }

    await fetchBookings();
  };

  const reopenBooking = async (bookingId: string) => {
    const response = await fetch(apiUrl(`/booking/${bookingId}/reopen`), {
      method: "PUT",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Could not reopen booking");
    }

    await fetchBookings();
  };

  const deleteBooking = async (bookingId: string) => {
    const response = await fetch(apiUrl(`/booking/${bookingId}`), {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Could not delete booking");
    }

    if (activeAssignId === bookingId) {
      setActiveAssignId(null);
    }

    await fetchBookings();
  };

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{
        background:
          "radial-gradient(circle at 12% 8%, rgba(122,106,0,0.14), transparent 34%), radial-gradient(circle at 88% 6%, rgba(30,144,255,0.12), transparent 30%), var(--off-white)",
      }}
    >
      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold" style={{ color: "var(--gray-900)", fontFamily: "var(--font-display)" }}>
          ServiceGo Admin Dashboard
        </h1>
        <div className="flex gap-2">
          <Link
            href="/admin/profile"
            className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50"
          >
            Admin Profile
          </Link>
          <Link
            href="/admin/services"
            className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50"
          >
            Manage Services
          </Link>
          <Link
            href="/admin/vendors"
            className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50"
          >
            Manage Vendor Profiles
          </Link>
        </div>
      </div>

      {/* ===== Stats Cards ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Bookings" value={total} color="bg-slate-800" />
        <StatCard title="Pending" value={pending} color="bg-amber-600" />
        <StatCard title="Admin Hold" value={pendingAdmin} color="bg-orange-600" />
        <StatCard title="Assigned" value={assigned} color="bg-sky-700" />
        <StatCard title="Completed" value={completed} color="bg-emerald-700" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {["all", "pending", "pending_admin", "assigned", "completed"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-full capitalize transition text-sm font-semibold ${
              statusFilter === status
                ? "text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-amber-50"
            }`}
            style={
              statusFilter === status
                ? { background: "linear-gradient(135deg, #7A6A00, #8B7500)" }
                : undefined
            }
          >
            {status === "pending_admin" ? "admin hold" : status}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 font-medium">Loading...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <table className="min-w-full">
            <thead className="text-white" style={{ background: "linear-gradient(135deg, #0f3f72, #1670CC)" }}>
              <tr>
                <th className="p-4 text-left">Customer</th>
                <th className="p-4 text-left">Service</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Vendor</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const matchingVendors = vendors.filter(
                  (vendor) => vendor.service_id === booking.service_id && vendor.is_active
                );

                return (
                  <tr key={booking.id} className="border-t hover:bg-amber-50/60 transition text-gray-800">
                    <td className="p-4">
                      <div className="font-medium">
                        {booking.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {booking.customer_phone}
                      </div>
                    </td>

                    <td className="p-4">
                      {booking.services?.name}
                    </td>

                    <td className="p-4">
                      <StatusBadge status={booking.status} />
                    </td>

                    <td className="p-4">
                      {booking.vendors ? (
                        <div>
                          <div className="font-medium">{booking.vendors.name}</div>
                          <div className="text-sm text-gray-500">{booking.vendors.phone || "Accepted vendor"}</div>
                        </div>
                      ) : (
                        <span>Awaiting vendor acceptance</span>
                      )}
                    </td>

                    <td className="p-4 space-x-2">
                      {(booking.status === "pending" ||
                        booking.status === "assigned") && (
                        <>
                          <button
                            onClick={() =>
                              setActiveAssignId(
                                activeAssignId === booking.id
                                  ? null
                                  : booking.id
                              )
                            }
                            className="px-3 py-1 text-white rounded text-sm transition"
                            style={{ background: "linear-gradient(135deg, #7A6A00, #8B7500)" }}
                          >
                            {booking.status === "assigned"
                              ? "Reassign"
                              : "Assign"}
                          </button>

                          {activeAssignId === booking.id && (
                            <select
                              className="ml-2 border p-1 rounded"
                              style={{ borderColor: "#d3d8e0" }}
                              defaultValue=""
                              onChange={async (e) => {
                                if (!e.target.value) {
                                  return;
                                }

                                try {
                                  await assignVendor(booking.id, e.target.value);
                                } catch (error) {
                                  setErrorMessage(error instanceof Error ? error.message : "Vendor assignment failed");
                                }
                              }}
                            >
                              <option value="">Select Vendor</option>
                              {matchingVendors.map((vendor) => (
                                <option
                                  key={vendor.id}
                                  value={vendor.id}
                                >
                                  {vendor.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </>
                      )}

                      {booking.status === "assigned" && (
                        <button
                          onClick={async () => {
                            try {
                              await unassignVendor(booking.id);
                            } catch (error) {
                              setErrorMessage(error instanceof Error ? error.message : "Could not cancel vendor acceptance");
                            }
                          }}
                          className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 transition"
                        >
                          Cancel Acceptance
                        </button>
                      )}

                      {booking.status === "assigned" && (
                        <button
                          onClick={async () => {
                            try {
                              await completeBooking(booking.id);
                            } catch (error) {
                              setErrorMessage(error instanceof Error ? error.message : "Could not complete booking");
                            }
                          }}
                          className="px-3 py-1 bg-emerald-700 text-white rounded text-sm hover:bg-emerald-800 transition"
                        >
                          Complete
                        </button>
                      )}

                      {booking.status === "completed" && (
                        <button
                          onClick={async () => {
                            try {
                              await reopenBooking(booking.id);
                            } catch (error) {
                              setErrorMessage(error instanceof Error ? error.message : "Could not reopen booking");
                            }
                          }}
                          className="px-3 py-1 bg-rose-600 text-white rounded text-sm hover:bg-rose-700 transition"
                        >
                          Reopen
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          const shouldDelete = window.confirm("Delete this booking? This action cannot be undone.");
                          if (!shouldDelete) {
                            return;
                          }

                          try {
                            await deleteBooking(booking.id);
                          } catch (error) {
                            setErrorMessage(error instanceof Error ? error.message : "Could not delete booking");
                          }
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredBookings.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              No bookings found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between hover:shadow-md transition">
      <div>
        <div className="text-sm text-gray-600 mb-2">{title}</div>
        <div className="text-3xl font-bold" style={{ color: "var(--gray-900)", fontFamily: "var(--font-display)" }}>
          {value}
        </div>
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} opacity-90`} />
    </div>
  );
}

function StatusBadge({ status }: { status: AdminBooking["status"] }) {
  const styles: Record<AdminBooking["status"], string> = {
    pending: "bg-yellow-100 text-yellow-700",
    pending_admin: "bg-orange-100 text-orange-700",
    assigned: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };

  const label = status === "pending_admin" ? "admin_hold" : status;

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}
    >
      {label}
    </span>
  );
}