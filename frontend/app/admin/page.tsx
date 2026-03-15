"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/env";

export default function AdminPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
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
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        await Promise.all([fetchBookings(), fetchVendors()]);
      } catch (error) {
        console.error("Failed to load admin dashboard", error);
        setErrorMessage("Could not load bookings right now. Please refresh in a moment.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const total = bookings.length;
  const pending = bookings.filter(b => b.status === "pending").length;
  const assigned = bookings.filter(b => b.status === "assigned").length;
  const completed = bookings.filter(b => b.status === "completed").length;

  const filteredBookings =
    statusFilter === "all"
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  const assignVendor = async (bookingId: string, vendorId: string) => {
    await fetch(apiUrl(`/booking/${bookingId}/assign`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_id: vendorId }),
    });
    setActiveAssignId(null);
    fetchBookings();
  };

  const completeBooking = async (bookingId: string) => {
    await fetch(apiUrl(`/booking/${bookingId}/complete`), {
      method: "PUT",
    });
    fetchBookings();
  };

  const reopenBooking = async (bookingId: string) => {
    await fetch(apiUrl(`/booking/${bookingId}/reopen`), {
      method: "PUT",
    });
    fetchBookings();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        ServiceGo Admin Dashboard
      </h1>

      {/* ===== Stats Cards ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard title="Total Bookings" value={total} color="bg-black" />
        <StatCard title="Pending" value={pending} color="bg-yellow-500" />
        <StatCard title="Assigned" value={assigned} color="bg-blue-600" />
        <StatCard title="Completed" value={completed} color="bg-green-600" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        {["all", "pending", "assigned", "completed"].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded capitalize transition ${
              statusFilter === status
                ? "bg-black text-white"
                : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100 text-gray-800">
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
                  (v) => v.service_id === booking.service_id && v.is_active
                );

                return (
                  <tr key={booking.id} className="border-t hover:bg-gray-50 transition text-gray-800">
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
                      {booking.vendors ? booking.vendors.name : "—"}
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
                            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition"
                          >
                            {booking.status === "assigned"
                              ? "Reassign"
                              : "Assign"}
                          </button>

                          {activeAssignId === booking.id && (
                            <select
                              className="ml-2 border p-1 rounded"
                              onChange={(e) =>
                                assignVendor(
                                  booking.id,
                                  e.target.value
                                )
                              }
                            >
                              <option>Select Vendor</option>
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
                          onClick={() =>
                            completeBooking(booking.id)
                          }
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                        >
                          Complete
                        </button>
                      )}

                      {booking.status === "completed" && (
                        <button
                          onClick={() =>
                            reopenBooking(booking.id)
                          }
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition"
                        >
                          Reopen
                        </button>
                      )}
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

function StatCard({ title, value, color }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 flex items-center justify-between hover:shadow-lg transition">
      <div>
        <div className="text-sm text-gray-600 mb-2">{title}</div>
        <div className="text-3xl font-bold text-black">{value}</div>
      </div>
      <div className={`w-12 h-12 rounded-xl ${color} opacity-80`} />
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles: any = {
    pending: "bg-yellow-100 text-yellow-700",
    assigned: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}