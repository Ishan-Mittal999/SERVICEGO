const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
      .select(`
        *,
        services (*),
        vendors (*)
      `)
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return res.status(500).json({ error: error.message });
    }

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

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        services (*),
        vendors (*)
      `)
      .eq("id", bookingId)
      .single();

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
      .select(`
        *,
        services (*),
        vendors (*)
      `)
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
      .select(`
        *,
        services (*),
        vendors (*)
      `)
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

    if (booking.status !== "pending") {
      return res.status(400).json({ error: "Booking already assigned or completed" });
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
    const { data, error } = await supabase
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

    return res.status(200).json({
      message: "Vendor assigned successfully",
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



app.get("/vendors/:auth_id/bookings", async (req, res) => {

  const { auth_id } = req.params;

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id")
    .eq("auth_user_id", auth_id)
    .single();

  if (vendorError || !vendor) {
    return res.status(404).json({ error: "Vendor not found" });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*, services(*)")
    .or(`vendor_auth_id.eq.${auth_id},vendor_id.eq.${vendor.id}`)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json(error);
  }

  res.json(data);
});

// Render provides PORT at runtime; fallback keeps local dev unchanged.
const PORT = process.env.PORT || 5000;

// 🚀 Server should ALWAYS be last
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

