"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { isVendorUser } from "@/lib/user-role";
import {
  readAddressBook,
  removeAddress,
  saveAddress,
  setDefaultAddress,
  type SavedAddress,
} from "@/lib/address-book";
import { readUserLocation } from "@/lib/location";
import { apiUrl } from "@/lib/env";
import { isValidIndianMobile, sanitizeIndianPhoneInput } from "@/lib/phone";

type UserBooking = {
  id: string | number;
  status?: "pending" | "assigned" | "completed";
  created_at?: string;
  total_amount?: number;
  services?: { name?: string };
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVendor, setIsVendor] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  
  // Edit profile modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);
  
  // Location selector modal state
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  
  // Bookings stat
  const [bookingStats, setBookingStats] = useState({ total: 0, confirmed: 0, pending: 0, totalSpent: 0 });
  const [recentBookings, setRecentBookings] = useState<UserBooking[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        router.replace("/auth/login?next=%2Fprofile");
        return;
      }

      const vendorAccount = await isVendorUser(currentUser.id);

      // Load bookings stats
      try {
        const response = await fetch(`${apiUrl}/customer-bookings`, {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });
        const bookings: UserBooking[] = await response.json();
        
        const stats = {
          total: bookings.length,
          confirmed: bookings.filter(b => b.status === "completed").length,
          pending: bookings.filter(b => b.status === "pending" || b.status === "assigned").length,
          totalSpent: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
        };
        
        if (isMounted) {
          setBookingStats(stats);
          setRecentBookings(bookings.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to load bookings:", err);
      }

      if (isMounted) {
        setUser(currentUser);
        setEditName(currentUser.user_metadata?.name || "");
        setEditEmail(currentUser.email || "");
        setEditPhone(sanitizeIndianPhoneInput(currentUser.user_metadata?.phone || ""));
        setEditAddress(currentUser.user_metadata?.address || "");
        setIsVendor(vendorAccount);
        setLoading(false);
        
        const loc = readUserLocation();
        setSelectedLocation(loc?.city || "");
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const username = useMemo(() => {
    if (!user?.email) {
      return "Unknown";
    }
    return user.email.split("@")[0];
  }, [user]);

  useEffect(() => {
    setAddresses(readAddressBook());
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;

    if (editPhone.trim() && !isValidIndianMobile(editPhone)) {
      setProfileErrorMessage("Enter a valid 10-digit mobile number.");
      return;
    }
    
    try {
      setProfileErrorMessage(null);
      await supabase.auth.updateUser({
        data: {
          name: editName,
          phone: sanitizeIndianPhoneInput(editPhone),
          address: editAddress,
        },
      });
      
      setUser({ ...user, user_metadata: { ...user.user_metadata, name: editName, phone: sanitizeIndianPhoneInput(editPhone), address: editAddress } });
      setEditModalOpen(false);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setProfileErrorMessage("Could not save profile. Please try again.");
    }
  };

  const handleUseCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          setSelectedLocation(data.address?.city || data.address?.town || "");
          setLocationSearch("");
        } catch (err) {
          console.error("Failed to get location:", err);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to access your location. Please enable location permissions.");
      }
    );
  };

  if (loading) {
    return (
      <main className="servicego-app-root" style={{ minHeight: "100vh", padding: "6rem 1rem 3rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
          <p>Loading profile...</p>
        </div>
      </main>
    );
  }

  const userInitial = user?.email?.charAt(0).toUpperCase() || "?";

  return (
    <>
      <main className="servicego-app-root" style={{ minHeight: "100vh", padding: "6rem 1rem 3rem" }}>
        <div className="container" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* PROFILE CARD SECTION */}
          <div className="profile-card-container">
            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar">{userInitial}</div>
              </div>
              
              <div className="profile-info-section">
                <h1 className="profile-name">{editName || user?.email?.split("@")[0] || "User"}</h1>
                <p className="profile-email">{user?.email || "-"}</p>
                <p className="profile-meta">Not provided</p>
              </div>
              
              <button
                type="button"
                onClick={() => setEditModalOpen(true)}
                className="profile-edit-btn"
              >
                Edit Profile
              </button>
            </div>

            {/* STATS GRID */}
            <div className="profile-stats-grid">
              <div className="profile-stat-item">
                <div className="stat-value">{bookingStats.total}</div>
                <div className="stat-label">Total Bookings</div>
              </div>
              <div className="profile-stat-item">
                <div className="stat-value">{bookingStats.confirmed}</div>
                <div className="stat-label">Confirmed</div>
              </div>
              <div className="profile-stat-item">
                <div className="stat-value">{bookingStats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
          </div>

          {/* SECONDARY SECTION */}
          <div className="profile-secondary-container">
            <div className="profile-total-spent">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value">Rs. {bookingStats.totalSpent.toFixed(2)}</div>
            </div>

            {/* RECENT BOOKINGS */}
            <div className="profile-section-block">
              <div className="section-header">
                <h2 className="section-title">RECENT BOOKINGS</h2>
                <button
                  type="button"
                  onClick={() => router.push("/bookings")}
                  className="section-view-all"
                >
                  View All
                </button>
              </div>
              
              {recentBookings.length === 0 ? (
                <p className="empty-state">No bookings yet. Start booking services to see them here!</p>
              ) : (
                <div className="bookings-list">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="booking-item">
                      <div className="booking-service">{booking.services?.name || "Service"}</div>
                      <div className="booking-date">{new Date(booking.created_at || "").toLocaleDateString()}</div>
                      <div className={`booking-status booking-status-${booking.status || "pending"}`}>
                        {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : "Pending"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ACCOUNT ACTIONS */}
            <div className="profile-section-block">
              <h2 className="section-title">ACCOUNT ACTIONS</h2>
              <div className="account-actions-list">
                <button
                  type="button"
                  onClick={() => router.push("/bookings")}
                  className="action-item"
                >
                  <span>View All Bookings</span>
                  <span className="action-arrow">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="action-item"
                >
                  <span>Select Location</span>
                  <span className="action-arrow">→</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.replace("/");
                  }}
                  className="action-item action-logout"
                >
                  <span>Logout</span>
                  <span className="action-arrow">→</span>
                </button>
              </div>
            </div>

            {/* ADDRESS BOOK */}
            <div className="profile-section-block">
              <h2 className="section-title">ADDRESS BOOK</h2>
              {addresses.length === 0 ? (
                <p className="empty-state">No saved addresses yet.</p>
              ) : (
                <div className="addresses-list">
                  {addresses.map((address) => (
                    <div key={address.id} className="address-item">
                      <div className="address-header">
                        <div className="address-label">{address.label}</div>
                        {address.isDefault && <span className="address-default-badge">Default</span>}
                      </div>
                      <div className="address-city">{address.city}</div>
                      <div className="address-line">{address.addressLine}</div>
                      <div className="address-phone">Phone: {address.phone || "Not set"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* EDIT PROFILE MODAL */}
      {editModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>EDIT PROFILE</h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-avatar-section">
              <div className="modal-avatar">{userInitial}</div>
            </div>

            <div className="modal-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Your email"
                  className="form-input"
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(sanitizeIndianPhoneInput(e.target.value))}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Your phone"
                  className="form-input"
                />
              </div>
              {editPhone && !isValidIndianMobile(editPhone) ? (
                <p className="auth-feedback auth-feedback--error">Enter a valid 10-digit mobile number.</p>
              ) : null}
              {profileErrorMessage ? <p className="auth-feedback auth-feedback--error">{profileErrorMessage}</p> : null}

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Your address"
                  className="form-textarea"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={Boolean(editPhone) && !isValidIndianMobile(editPhone)}
                  className="btn-save"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOCATION SELECTOR MODAL */}
      {locationModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setLocationModalOpen(false)}>
          <div className="profile-modal location-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>SELECT YOUR LOCATION</h2>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="location-form">
              <div className="location-search-group">
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Search for your location..."
                  className="location-input"
                />
              </div>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="use-current-location-btn"
              >
                <span className="location-icon">📍</span>
                Use current location
              </button>

              {selectedLocation && (
                <div className="selected-location-display">
                  <strong>Selected:</strong> {selectedLocation}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="btn-save"
                >
                  Confirm Location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
