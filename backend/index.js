const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const webpush = require("web-push");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

if (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT || "mailto:support@servicego.local",
    process.env.WEB_PUSH_PUBLIC_KEY,
    process.env.WEB_PUSH_PRIVATE_KEY
  );
}

const BOOKING_SELECT = `
  *,
  services (*),
  vendors (*)
`;

async function getBookingWithRelations(bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", bookingId)
    .single();

  return { data, error };
}

function canSendPushNotifications() {
  return Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);
}

async function sendPushToServiceVendors(serviceId, payload) {
  if (!canSendPushNotifications()) {
    return;
  }

  const normalizedServiceId = String(serviceId);

  const { data: subscriptions, error } = await supabase
    .from("vendor_push_subscriptions")
    .select("auth_user_id, subscription")
    .eq("service_id", normalizedServiceId);

  if (error) {
    console.error("Push subscription fetch failed:", error.message);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  await Promise.all(
    subscriptions.map(async (entry) => {
      try {
        await webpush.sendNotification(entry.subscription, JSON.stringify(payload));
      } catch (pushError) {
        const statusCode = pushError?.statusCode;

        // Remove invalid or expired subscriptions so future sends stay clean.
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("vendor_push_subscriptions")
            .delete()
            .eq("auth_user_id", entry.auth_user_id);
        }

        console.error("Push send failed:", pushError?.message || pushError);
      }
    })
  );
}

// Root route
app.get("/", (req, res) => {
  res.send("ServiceGo API Running 🚀");
});

// POST Booking route
app.post("/booking", async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      service_id,
      address,
      preferred_time,
      user_id
    } = req.body;

    if (!customer_name || !customer_phone || !service_id || !address) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          customer_name,
          customer_phone,
          service_id,
          address,
          preferred_time,
          user_id,
          status: "pending"
        }
      ])
      .select(BOOKING_SELECT)
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ error: error.message });
    }

    await sendPushToServiceVendors(service_id, {
      title: "New service request",
      body: `${customer_name} requested a service in your category.`,
      url: "/vendor/dashboard",
      bookingId: data.id,
    });

    return res.status(201).json({
      message: "Booking created successfully",
      booking: data
    });

  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/booking/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;

    const { data, error } = await getBookingWithRelations(bookingId);

    if (error || !data) {
      return res.status(404).json({ error: "Booking not found" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/bookings/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data ?? []);
  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 👇 ADD GET /bookings HERE
app.get("/bookings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.put("/booking/:id/assign", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { vendor_id } = req.body;

    if (!vendor_id) {
      return res.status(400).json({ error: "Vendor ID required" });
    }

    // 1️⃣ Check booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ error: "Completed booking cannot be reassigned" });
    }

    // 2️⃣ Check vendor exists
    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", vendor_id)
      .single();

    if (vendorError || !vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    if (!vendor.is_active) {
      return res.status(400).json({ error: "Vendor is not active" });
    }

    // 3️⃣ Check vendor service match
    if (vendor.service_id !== booking.service_id) {
      return res.status(400).json({ error: "Vendor does not match service type" });
    }

    // 4️⃣ Update booking
    const { error } = await supabase
      .from("bookings")
      .update({
        vendor_id,
        vendor_auth_id: vendor.auth_user_id || null,
        status: "assigned"
      })
      .eq("id", bookingId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data, error: refreshedBookingError } = await getBookingWithRelations(bookingId);

    if (refreshedBookingError || !data) {
      return res.status(500).json({ error: refreshedBookingError?.message || "Booking assigned but reload failed" });
    }

    return res.status(200).json({
      message: "Vendor assigned successfully",
      booking: data
    });

  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.put("/booking/:id/accept", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { vendor_auth_id } = req.body;

    if (!vendor_auth_id) {
      return res.status(400).json({ error: "Vendor auth ID required" });
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, auth_user_id, service_id, is_active")
      .eq("auth_user_id", vendor_auth_id)
      .single();

    if (vendorError || !vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    if (!vendor.is_active) {
      return res.status(400).json({ error: "Vendor is offline or inactive" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, service_id, status, vendor_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.service_id !== vendor.service_id) {
      return res.status(400).json({ error: "This booking is not in your service category" });
    }

    if (booking.status !== "pending" || booking.vendor_id) {
      return res.status(409).json({ error: "This booking has already been accepted by another vendor" });
    }

    const { data: acceptedRows, error: acceptError } = await supabase
      .from("bookings")
      .update({
        vendor_id: vendor.id,
        vendor_auth_id: vendor.auth_user_id,
        status: "assigned"
      })
      .eq("id", bookingId)
      .eq("status", "pending")
      .is("vendor_id", null)
      .select("id");

    if (acceptError) {
      return res.status(500).json({ error: acceptError.message });
    }

    if (!acceptedRows || acceptedRows.length === 0) {
      return res.status(409).json({ error: "This booking was taken just now by another vendor" });
    }

    const { data, error } = await getBookingWithRelations(bookingId);

    if (error || !data) {
      return res.status(500).json({ error: error?.message || "Booking accepted but reload failed" });
    }

    return res.status(200).json({
      message: "Booking accepted successfully",
      booking: data
    });
  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.put("/booking/:id/unassign", async (req, res) => {
  try {
    const bookingId = req.params.id;

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "assigned") {
      return res.status(400).json({ error: "Only assigned bookings can be moved to admin hold" });
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        // Admin-cancelled jobs should not reappear in vendor broadcast automatically.
        status: "pending_admin",
        vendor_id: null,
        vendor_auth_id: null
      })
      .eq("id", bookingId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data, error: refreshedBookingError } = await getBookingWithRelations(bookingId);

    if (refreshedBookingError || !data) {
      return res.status(500).json({ error: refreshedBookingError?.message || "Booking unassigned but reload failed" });
    }

    return res.status(200).json({
      message: "Vendor removed from booking",
      booking: data
    });
  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.put("/booking/:id/complete", async (req, res) => {
  try {
    const bookingId = req.params.id;

    // 1️⃣ Check booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // 2️⃣ Allow only if assigned
    if (booking.status !== "assigned") {
      return res.status(400).json({
        error: "Only assigned bookings can be completed"
      });
    }

    // 3️⃣ Update status
    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Booking marked as completed",
      booking: data
    });

  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.put("/booking/:id/reopen", async (req, res) => {
  try {
    const bookingId = req.params.id;

    // 1️⃣ Check booking exists
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // 2️⃣ Only allow reopen if completed
    if (booking.status !== "completed") {
      return res.status(400).json({
        error: "Only completed bookings can be reopened"
      });
    }

    // 3️⃣ Reset status and vendor
    const { data, error } = await supabase
      .from("bookings")
      .update({
        status: "pending",
        vendor_id: null,
        vendor_auth_id: null
      })
      .eq("id", bookingId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Booking reopened successfully",
      booking: data
    });

  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/booking/:id", async (req, res) => {
  try {
    const bookingId = req.params.id;

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/vendors", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vendors")
      .select("*");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/vendors/:id", async (req, res) => {
  try {
    const vendorId = req.params.id;
    const updatePayload = { ...(req.body || {}) };

    if (!vendorId) {
      return res.status(400).json({ error: "Vendor ID is required" });
    }

    delete updatePayload.id;
    delete updatePayload.created_at;
    delete updatePayload.updated_at;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const { data, error } = await supabase
      .from("vendors")
      .update(updatePayload)
      .eq("id", vendorId)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Vendor updated", vendor: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/vendors/:id", async (req, res) => {
  try {
    const vendorId = req.params.id;

    if (!vendorId) {
      return res.status(400).json({ error: "Vendor ID is required" });
    }

    const { data: existingVendor, error: fetchError } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("id", vendorId)
      .single();

    if (fetchError || !existingVendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const { error } = await supabase
      .from("vendors")
      .delete()
      .eq("id", vendorId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Vendor deleted", vendorId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
// GET Services route
app.get("/services", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      // .eq("is_active", true); // optional but recommended

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/services", async (req, res) => {
  try {
    const payload = { ...(req.body || {}) };

    if (!payload.name || !String(payload.name).trim()) {
      return res.status(400).json({ error: "Service name is required" });
    }

    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    const { data, error } = await supabase
      .from("services")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ message: "Service created", service: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put("/services/:id", async (req, res) => {
  try {
    const serviceId = req.params.id;
    const payload = { ...(req.body || {}) };

    if (!serviceId) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const { data, error } = await supabase
      .from("services")
      .update(payload)
      .eq("id", serviceId)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Service updated", service: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/services/:id", async (req, res) => {
  try {
    const serviceId = req.params.id;

    if (!serviceId) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Service deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



app.get("/vendors/:auth_id/bookings", async (req, res) => {

  const { auth_id } = req.params;

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, service_id, is_active")
    .eq("auth_user_id", auth_id)
    .single();

  if (vendorError || !vendor) {
    return res.status(404).json({ error: "Vendor not found" });
  }

  const { data: assignedBookings, error: assignedError } = await supabase
    .from("bookings")
    .select("*, services(*), vendors(*)")
    .or(`vendor_auth_id.eq.${auth_id},vendor_id.eq.${vendor.id}`)
    .order("created_at", { ascending: false });

  if (assignedError) {
    return res.status(500).json(assignedError);
  }

  const { data: openBookings, error: openError } = await supabase
    .from("bookings")
    .select("*, services(*), vendors(*)")
    .eq("service_id", vendor.service_id)
    .eq("status", "pending")
    .is("vendor_id", null)
    .order("created_at", { ascending: false });

  if (openError) {
    return res.status(500).json(openError);
  }

  const dedupedBookings = [...(assignedBookings || []), ...(openBookings || [])].reduce((accumulator, booking) => {
    if (!accumulator.some((item) => item.id === booking.id)) {
      accumulator.push(booking);
    }
    return accumulator;
  }, []);

  dedupedBookings.sort((left, right) => {
    const leftTime = new Date(left.created_at || 0).getTime();
    const rightTime = new Date(right.created_at || 0).getTime();
    return rightTime - leftTime;
  });

  res.json(dedupedBookings);
});

app.post("/push/subscribe", async (req, res) => {
  try {
    const { vendor_auth_id, subscription } = req.body;

    if (!vendor_auth_id || !subscription?.endpoint) {
      return res.status(400).json({ error: "Vendor auth ID and push subscription are required" });
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("auth_user_id, service_id")
      .eq("auth_user_id", vendor_auth_id)
      .single();

    if (vendorError || !vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const { error: upsertError } = await supabase
      .from("vendor_push_subscriptions")
      .upsert(
        {
          auth_user_id: vendor_auth_id,
          service_id: String(vendor.service_id),
          subscription,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "auth_user_id" }
      );

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }

    return res.status(200).json({ message: "Push subscription saved" });
  } catch (err) {
    console.error("Push subscribe failure:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/push/unsubscribe", async (req, res) => {
  try {
    const { vendor_auth_id } = req.body;

    if (!vendor_auth_id) {
      return res.status(400).json({ error: "Vendor auth ID is required" });
    }

    const { error } = await supabase
      .from("vendor_push_subscriptions")
      .delete()
      .eq("auth_user_id", vendor_auth_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Push subscription removed" });
  } catch (err) {
    console.error("Push unsubscribe failure:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Render provides PORT at runtime; fallback keeps local dev unchanged.
const PORT = process.env.PORT || 5000;

// 🚀 Server should ALWAYS be last
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

