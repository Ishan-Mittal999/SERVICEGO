const express = require("express");
const cors = require("cors");
const compression = require("compression");
const crypto = require("crypto");
const Razorpay = require("razorpay");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const webpush = require("web-push");

const app = express();
app.use(cors());
app.use(compression()); // Enable gzip compression for all responses
app.use(express.json());

// Cache middleware for GET requests
const setCacheHeaders = (req, res, next) => {
  if (req.method === "GET") {
    // Cache static data endpoints for longer (1 hour)
    if (req.path === "/services" || req.path.startsWith("/services/")) {
      res.set("Cache-Control", "public, max-age=3600"); // 1 hour
    }
    // Vendor availability is real-time; do not cache vendor endpoints.
    else if (req.path === "/vendors" || req.path.startsWith("/vendors/")) {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    }
    // Dynamic endpoints (bookings, push) - no caching
    else {
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    }
  }
  next();
};
app.use(setCacheHeaders);

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

const SUPPORTED_PAYMENT_METHODS = new Set(["cod", "upi", "card", "netbanking"]);
const COD_PROVIDER = "cod";
const ONLINE_PROVIDER = "razorpay";
const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || "").trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
const razorpayClient = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
  ? new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  })
  : null;
const paymentOrderStore = new Map();
const responseCacheStore = new Map();
const VENDORS_CACHE_TTL_MS = 0;
const SERVICES_CACHE_TTL_MS = 5 * 60 * 1000;

function nowMs() {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

function logRouteTiming(route, startedAtMs, details = {}) {
  const durationMs = Math.round((nowMs() - startedAtMs) * 10) / 10;
  console.log(`[perf] ${route} ${durationMs}ms`, details);
}

function readResponseCache(key, ttlMs) {
  if (!ttlMs || ttlMs <= 0) {
    return null;
  }

  const cached = responseCacheStore.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.cachedAt > ttlMs) {
    responseCacheStore.delete(key);
    return null;
  }

  return cached.payload;
}

function writeResponseCache(key, payload) {
  responseCacheStore.set(key, {
    cachedAt: Date.now(),
    payload,
  });
}

function invalidateResponseCacheByPrefix(prefix) {
  for (const key of responseCacheStore.keys()) {
    if (key.startsWith(prefix)) {
      responseCacheStore.delete(key);
    }
  }
}

async function warmServicesResponseCache() {
  const warmConfigs = [
    { limit: 50, offset: 0 },
    { limit: 100, offset: 0 },
  ];

  for (const config of warmConfigs) {
    const cacheKey = ["services", config.limit, config.offset].join("|");
    const cachedPayload = readResponseCache(cacheKey, SERVICES_CACHE_TTL_MS);
    if (cachedPayload) {
      continue;
    }

    const startedAtMs = nowMs();
    const { data, error, count } = await supabase
      .from("services")
      .select("*", { count: "planned" })
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(config.offset, config.offset + config.limit - 1);

    if (error) {
      console.error("Warm cache services fetch error:", error.message);
      continue;
    }

    writeResponseCache(cacheKey, {
      data,
      pagination: {
        limit: config.limit,
        offset: config.offset,
        total: count,
        hasMore: config.offset + config.limit < count,
      },
    });

    logRouteTiming("warm:/services", startedAtMs, {
      limit: config.limit,
      rows: Array.isArray(data) ? data.length : 0,
    });
  }
}

function createRazorpaySignature(providerOrderId, providerPaymentId) {
  const payload = [providerOrderId, providerPaymentId].join("|");
  return crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");
}

function normalizePaymentMethod(method) {
  return String(method || "").trim().toLowerCase();
}

function normalizePaymentStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function extractBookingAddressDetails(rawAddress) {
  const source = String(rawAddress || "").trim();
  if (!source) {
    return {
      cleanAddress: "",
      serviceSummaryFromAddress: "",
    };
  }

  const segments = source
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const addressSegments = [];
  let city = "";
  let serviceSummary = "";

  for (const segment of segments) {
    const keyValueMatch = segment.match(/^([a-zA-Z ]+):\s*(.*)$/);
    if (!keyValueMatch) {
      addressSegments.push(segment);
      continue;
    }

    const key = String(keyValueMatch[1] || "").trim().toLowerCase();
    const value = String(keyValueMatch[2] || "").trim();

    if (!value) {
      continue;
    }

    if (key === "city") {
      city = value;
      continue;
    }

    if (
      key === "item"
      || key === "items"
      || key === "service"
      || key === "services"
      || key === "package"
      || key === "subservice"
      || key === "subservices"
    ) {
      if (!serviceSummary) {
        serviceSummary = value;
      }
      continue;
    }

    if (key === "shop" || key === "payment") {
      continue;
    }

    addressSegments.push(segment);
  }

  const cleanAddress = [...addressSegments, city].filter(Boolean).join(", ");

  return {
    cleanAddress: cleanAddress || source,
    serviceSummaryFromAddress: serviceSummary,
  };
}

function normalizeBookingPayload(booking) {
  if (!booking || typeof booking !== "object") {
    return booking;
  }

  const { cleanAddress, serviceSummaryFromAddress } = extractBookingAddressDetails(booking.address);

  return {
    ...booking,
    address: cleanAddress || booking.address,
    service_summary: booking.service_summary || serviceSummaryFromAddress || null,
  };
}

async function getBookingWithRelations(bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", bookingId)
    .single();

  return { data: normalizeBookingPayload(data), error };
}

async function enrichVendorsWithRatings(vendors) {
  const vendorList = Array.isArray(vendors) ? vendors : [];
  const vendorIds = vendorList
    .map((vendor) => String(vendor?.id || "").trim())
    .filter(Boolean);

  if (vendorIds.length === 0) {
    return vendorList.map((vendor) => ({
      ...vendor,
      rating_average: null,
      rating_count: 0,
    }));
  }

  const { data: ratingRows, error } = await supabase
    .from("bookings")
    .select("vendor_id, customer_rating")
    .eq("status", "completed")
    .not("customer_rating", "is", null)
    .in("vendor_id", vendorIds);

  if (error) {
    console.error("Vendor rating fetch failed:", error.message);
    return vendorList.map((vendor) => ({
      ...vendor,
      rating_average: null,
      rating_count: 0,
    }));
  }

  const ratingSummary = new Map();

  for (const row of ratingRows || []) {
    const vendorId = String(row?.vendor_id || "").trim();
    const ratingValue = Number(row?.customer_rating);

    if (!vendorId || !Number.isFinite(ratingValue)) {
      continue;
    }

    const current = ratingSummary.get(vendorId) || { total: 0, count: 0 };
    current.total += ratingValue;
    current.count += 1;
    ratingSummary.set(vendorId, current);
  }

  return vendorList.map((vendor) => {
    const summary = ratingSummary.get(String(vendor?.id || "").trim());

    if (!summary || summary.count === 0) {
      return {
        ...vendor,
        rating_average: null,
        rating_count: 0,
      };
    }

    return {
      ...vendor,
      rating_average: Math.round((summary.total / summary.count) * 10) / 10,
      rating_count: summary.count,
    };
  });
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

function isVendorApproved(vendor) {
  if (!vendor || typeof vendor !== "object") {
    return false;
  }

  const status = String(vendor.approval_status || "").trim().toLowerCase();
  if (!status) {
    return true;
  }

  return status === "approved";
}

function parseVendorServicemen(value) {
  const parsedArray = (() => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim();
      if (!normalized) {
        return [];
      }

      try {
        const parsed = JSON.parse(normalized);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    return [];
  })();

  return parsedArray
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const id = String(entry.id || `serviceman-${index + 1}`).trim();
      const name = String(entry.name || "").trim();
      const phone = String(entry.phone || "").trim();

      if (!id || !name) {
        return null;
      }

      return {
        id,
        name,
        phone,
      };
    })
    .filter(Boolean);
}

function normalizeVendorServiceText(value) {
  return String(value || "").trim().toLowerCase();
}

function isACServiceName(normalizedName) {
  return /\bac\b/.test(normalizedName)
    || normalizedName.includes("air conditioner")
    || normalizedName.includes("air conditioning");
}

function getVendorServiceKey(serviceName) {
  const normalized = normalizeVendorServiceText(serviceName);

  if (normalized.includes("washing")) return "washing_machine";
  if (isACServiceName(normalized)) return "ac";
  if (normalized.includes("geyser")) return "geyser";
  if (normalized.includes("chimney")) return "chimney";
  if (normalized.includes("refrigerator") || normalized.includes("fridge")) return "refrigerator";
  if (normalized.includes("ro") || normalized.includes("purifier")) return "ro";
  if (normalized.includes("microwave")) return "microwave";
  if (normalized.includes("heater")) return "heater";
  if (normalized.includes("cooler")) return "cooler";

  return normalized.replace(/\s+/g, "_");
}

function parsePostgresArrayString(rawValue) {
  if (typeof rawValue !== "string") {
    return [];
  }

  const normalized = rawValue.trim();
  if (!normalized.startsWith("{") || !normalized.endsWith("}")) {
    return [];
  }

  const body = normalized.slice(1, -1);
  if (!body) {
    return [];
  }

  const items = [];
  let current = "";
  let inQuotes = false;
  let escaped = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      items.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items.filter(Boolean);
}

function parseVendorListField(value) {
  const normalizeEntry = (entry) => {
    const trimmed = String(entry || "").trim();
    if (!trimmed) {
      return "";
    }

    if (trimmed.includes("::")) {
      return String(trimmed.split("::")[0] || "").trim();
    }

    return trimmed;
  };

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeEntry(item))
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalized);
      if (parsed == null) {
        return [];
      }

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeEntry(item))
          .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
      }
    } catch {
      // Fallback to comma-separated values.
    }

    const postgresArray = parsePostgresArrayString(normalized);
    if (postgresArray.length > 0) {
      return postgresArray
        .map((item) => normalizeEntry(item))
        .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
    }

    return normalized
      .split(",")
      .map((item) => normalizeEntry(item))
      .filter((item) => item && item.toLowerCase() !== "null" && item.toLowerCase() !== "undefined");
  }

  return [];
}

function isSchemaColumnCompatibilityError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (!message) {
    return false;
  }

  return (
    (message.includes("column") && message.includes("does not exist"))
    || message.includes("schema cache")
    || message.includes("could not find the")
  );
}

function extractMissingColumnFromSchemaError(error) {
  const message = String(error?.message || "");
  if (!message) {
    return "";
  }

  const couldNotFindMatch = message.match(/could not find the ['\"]([^'\"]+)['\"] column/i);
  if (couldNotFindMatch?.[1]) {
    return couldNotFindMatch[1].trim();
  }

  const columnDoesNotExistMatch = message.match(/column ['\"]?([^'\"\s]+)['\"]? .* does not exist/i);
  if (columnDoesNotExistMatch?.[1]) {
    return columnDoesNotExistMatch[1].trim();
  }

  return "";
}

function vendorOffersService(vendor, targetServiceId, targetServiceName) {
  const normalizedServiceId = targetServiceId ? String(targetServiceId).trim() : "";
  const normalizedServiceName = normalizeVendorServiceText(targetServiceName);
  const targetServiceKey = normalizedServiceName ? getVendorServiceKey(normalizedServiceName) : "";

  if (!normalizedServiceId && !normalizedServiceName) {
    return true;
  }

  if (normalizedServiceId && String(vendor.service_id || "").trim() === normalizedServiceId) {
    return true;
  }

  const vendorServiceIds = parseVendorListField(vendor.service_ids);
  if (normalizedServiceId && vendorServiceIds.some((id) => String(id).trim() === normalizedServiceId)) {
    return true;
  }

  const vendorServiceNames = parseVendorListField(vendor.selected_service_names)
    .map((name) => normalizeVendorServiceText(name));
  if (normalizedServiceName && vendorServiceNames.some((name) => name === normalizedServiceName)) {
    return true;
  }

  if (targetServiceKey) {
    const vendorServiceKeys = vendorServiceNames.map((name) => getVendorServiceKey(name));
    if (vendorServiceKeys.some((key) => key === targetServiceKey)) {
      return true;
    }
  }

  return false;
}

async function isServicemanBusy(vendorAuthId, servicemanId, excludeBookingId = null) {
  let query = supabase
    .from("bookings")
    .select("id")
    .eq("vendor_auth_id", vendorAuthId)
    .eq("status", "assigned")
    .eq("assigned_serviceman_id", servicemanId);

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) && data.length > 0;
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
      user_id,
      service_summary,
      estimated_amount,
      payment_method,
      payment_status,
      payment_provider,
      payment_order_id,
      payment_id,
      payment_verified_at,
    } = req.body;

    if (!customer_name || !customer_phone || !service_id || !address) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const parsedEstimatedAmount = Number(estimated_amount);
    const normalizedEstimatedAmount = Number.isFinite(parsedEstimatedAmount) && parsedEstimatedAmount >= 0
      ? parsedEstimatedAmount
      : null;
    const normalizedServiceSummary = typeof service_summary === "string"
      ? service_summary.trim()
      : "";

    const normalizedPaymentMethod = normalizePaymentMethod(payment_method || "cod");
    if (!SUPPORTED_PAYMENT_METHODS.has(normalizedPaymentMethod)) {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const normalizedPaymentStatus = normalizePaymentStatus(
      payment_status || (normalizedPaymentMethod === "cod" ? "pending" : "paid")
    );
    const allowedPaymentStatuses = new Set(["pending", "paid", "failed", "refunded"]);
    if (!allowedPaymentStatuses.has(normalizedPaymentStatus)) {
      return res.status(400).json({ error: "Invalid payment status" });
    }

    const normalizedPaymentProvider = String(
      payment_provider || (normalizedPaymentMethod === "cod" ? COD_PROVIDER : ONLINE_PROVIDER)
    )
      .trim()
      .toLowerCase();
    const normalizedPaymentOrderId = String(payment_order_id || "").trim() || null;
    const normalizedPaymentId = String(payment_id || "").trim() || null;

    let normalizedPaymentVerifiedAt = null;
    if (payment_verified_at) {
      const parsedVerifiedAt = new Date(payment_verified_at);
      if (!Number.isNaN(parsedVerifiedAt.getTime())) {
        normalizedPaymentVerifiedAt = parsedVerifiedAt.toISOString();
      }
    }

    if (normalizedPaymentStatus === "paid" && normalizedPaymentMethod !== "cod") {
      if (!normalizedPaymentOrderId || !normalizedPaymentId) {
        return res.status(400).json({ error: "Missing payment gateway identifiers for paid online booking" });
      }
    }

    const baseBookingPayload = {
      customer_name,
      customer_phone,
      service_id,
      address,
      preferred_time,
      user_id,
      service_summary: normalizedServiceSummary || null,
      estimated_amount: normalizedEstimatedAmount,
      payment_method: normalizedPaymentMethod,
      payment_status: normalizedPaymentStatus,
      payment_provider: normalizedPaymentProvider || null,
      payment_order_id: normalizedPaymentOrderId,
      payment_id: normalizedPaymentId,
      payment_verified_at: normalizedPaymentVerifiedAt,
      status: "pending",
    };

    const insertBooking = async (payload) => {
      return supabase
        .from("bookings")
        .insert([payload])
        .select(BOOKING_SELECT)
        .single();
    };

    let { data, error } = await insertBooking(baseBookingPayload);

    if (error) {
      const errorMessage = String(error.message || error?.details || error?.hint || "");
      const looksLikeMissingPaymentColumn = /payment_(id|order_id|status|method|provider|verified_at)/i.test(errorMessage);
      const looksLikeSchemaCacheIssue = /schema cache|could not find the .* column/i.test(errorMessage);

      if (looksLikeMissingPaymentColumn || looksLikeSchemaCacheIssue) {
        const fallbackPayload = {
          customer_name,
          customer_phone,
          service_id,
          address,
          preferred_time,
          user_id,
          service_summary: normalizedServiceSummary || null,
          estimated_amount: normalizedEstimatedAmount,
          status: "pending",
        };

        ({ data, error } = await insertBooking(fallbackPayload));
      }
    }

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

    const normalizedRows = Array.isArray(data) ? data.map((row) => normalizeBookingPayload(row)) : [];
    return res.status(200).json(normalizedRows);
  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

// 👇 ADD GET /bookings HERE
app.get("/bookings", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const status = req.query.status ? String(req.query.status).trim() : null;
    const userId = req.query.userId ? String(req.query.userId).trim() : null;
    const serviceId = req.query.serviceId ? String(req.query.serviceId).trim() : null;

    // Build filtered query
    let query = supabase
      .from("bookings")
      .select(BOOKING_SELECT, { count: "exact" });

    if (status) {
      query = query.eq("status", status);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (serviceId) {
      query = query.eq("service_id", serviceId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return res.status(500).json({ error: error.message });
    }

    const normalizedRows = Array.isArray(data) ? data.map((row) => normalizeBookingPayload(row)) : [];

    return res.status(200).json({
      data: normalizedRows,
      pagination: {
        limit,
        offset,
        total: count,
        hasMore: offset + limit < count
      }
    });

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

    if (!isVendorApproved(vendor)) {
      return res.status(400).json({ error: "Vendor is awaiting admin approval" });
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
    const { vendor_auth_id, serviceman_id } = req.body;

    if (!vendor_auth_id) {
      return res.status(400).json({ error: "Vendor auth ID required" });
    }

    if (!serviceman_id) {
      return res.status(400).json({ error: "Please select a serviceman before accepting this booking" });
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, auth_user_id, service_id, service_ids, is_active, approval_status, servicemen_details")
      .eq("auth_user_id", vendor_auth_id)
      .single();

    if (vendorError || !vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    if (!vendor.is_active) {
      return res.status(400).json({ error: "Vendor is offline or inactive" });
    }

    if (!isVendorApproved(vendor)) {
      return res.status(403).json({ error: "Your account is pending admin approval" });
    }

    const servicemen = parseVendorServicemen(vendor.servicemen_details);
    const assignedServiceman = servicemen.find((person) => person.id === String(serviceman_id));

    if (!assignedServiceman) {
      return res.status(400).json({ error: "Selected serviceman not found in your profile" });
    }

    const alreadyBusy = await isServicemanBusy(vendor.auth_user_id, assignedServiceman.id);
    if (alreadyBusy) {
      return res.status(409).json({ error: "This serviceman is already assigned to another ongoing job" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, service_id, status, vendor_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const vendorServiceIds = Array.from(
      new Set(
        [vendor.service_id, ...parseVendorListField(vendor.service_ids)]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );

    if (!vendorServiceIds.includes(String(booking.service_id || "").trim())) {
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
        status: "assigned",
        assigned_serviceman_id: assignedServiceman.id,
        assigned_serviceman_name: assignedServiceman.name,
        assigned_serviceman_phone: assignedServiceman.phone || null,
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

app.put("/booking/:id/serviceman", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { vendor_auth_id, serviceman_id } = req.body;

    if (!vendor_auth_id || !serviceman_id) {
      return res.status(400).json({ error: "Vendor auth ID and serviceman ID are required" });
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("id, auth_user_id, servicemen_details, approval_status")
      .eq("auth_user_id", vendor_auth_id)
      .single();

    if (vendorError || !vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    if (!isVendorApproved(vendor)) {
      return res.status(403).json({ error: "Your account is pending admin approval" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, vendor_auth_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "assigned") {
      return res.status(400).json({ error: "Serviceman can only be assigned on active assigned jobs" });
    }

    if (String(booking.vendor_auth_id || "") !== String(vendor_auth_id)) {
      return res.status(403).json({ error: "This booking is not assigned to you" });
    }

    const servicemen = parseVendorServicemen(vendor.servicemen_details);
    const assignedServiceman = servicemen.find((person) => person.id === String(serviceman_id));

    if (!assignedServiceman) {
      return res.status(400).json({ error: "Selected serviceman not found in your profile" });
    }

    const alreadyBusy = await isServicemanBusy(vendor_auth_id, assignedServiceman.id, bookingId);
    if (alreadyBusy) {
      return res.status(409).json({ error: "This serviceman is already assigned to another ongoing job" });
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        assigned_serviceman_id: assignedServiceman.id,
        assigned_serviceman_name: assignedServiceman.name,
        assigned_serviceman_phone: assignedServiceman.phone || null,
      })
      .eq("id", bookingId);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    const { data, error } = await getBookingWithRelations(bookingId);

    if (error || !data) {
      return res.status(500).json({ error: error?.message || "Serviceman assigned but reload failed" });
    }

    return res.status(200).json({
      message: "Serviceman assigned successfully",
      booking: data,
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
        vendor_auth_id: null,
        assigned_serviceman_id: null,
        assigned_serviceman_name: null,
        assigned_serviceman_phone: null,
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

    invalidateResponseCacheByPrefix("vendors|");

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
        vendor_auth_id: null,
        assigned_serviceman_id: null,
        assigned_serviceman_name: null,
        assigned_serviceman_phone: null,
        customer_rating: null,
        customer_review: null,
        customer_rated_at: null,
      })
      .eq("id", bookingId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    invalidateResponseCacheByPrefix("vendors|");

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

app.post("/booking/:id/rating", async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = String(req.body?.userId || "").trim();
    const rating = Number(req.body?.rating);
    const review = String(req.body?.review || "").trim().slice(0, 500);

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (String(booking.user_id || "") !== userId) {
      return res.status(403).json({ error: "You can only rate your own booking" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({ error: "You can only rate a completed booking" });
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({
        customer_rating: rating,
        customer_review: review || null,
        customer_rated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select(BOOKING_SELECT)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    invalidateResponseCacheByPrefix("vendors|");

    return res.status(200).json({
      message: "Rating saved successfully",
      booking: data,
    });
  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.get("/vendors", async (req, res) => {
  const startedAtMs = nowMs();
  try {
    const includeAll = String(req.query.includeAll || "").toLowerCase() === "true";
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const serviceId = req.query.serviceId ? String(req.query.serviceId).trim() : null;
    const serviceName = req.query.serviceName ? String(req.query.serviceName).trim() : null;
    const cacheKey = ["vendors", includeAll, limit, offset, serviceId || "", serviceName || ""].join("|");
    const cachedPayload = readResponseCache(cacheKey, VENDORS_CACHE_TTL_MS);

    if (cachedPayload) {
      logRouteTiming("GET /vendors", startedAtMs, {
        cache: "hit",
        includeAll,
        limit,
        offset,
        serviceId: serviceId || null,
      });
      return res.status(200).json(cachedPayload);
    }

    let query = supabase
      .from("vendors")
      .select("*");

    if (!includeAll) {
      query = query.eq("is_active", true);
    }

    const needsServiceFiltering = Boolean(serviceId || serviceName);

    if (needsServiceFiltering) {
      let normalizedServiceName = normalizeVendorServiceText(serviceName);

      if (!normalizedServiceName && serviceId) {
        const { data: serviceRecord } = await supabase
          .from("services")
          .select("name")
          .eq("id", serviceId)
          .single();

        normalizedServiceName = normalizeVendorServiceText(serviceRecord?.name || "");
      }

      const { data: candidates, error } = await query.select(
        "id, service_id, service_ids, selected_service_names, approval_status"
      );

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      let filtered = (candidates || []).filter((vendor) =>
        vendorOffersService(vendor, serviceId, normalizedServiceName)
      );

      if (!includeAll) {
        filtered = filtered.filter((vendor) => isVendorApproved(vendor));
      }

      const pagedIds = filtered
        .slice(offset, offset + limit)
        .map((vendor) => String(vendor.id));

      let pagedData = [];
      if (pagedIds.length > 0) {
        const { data: pagedRows, error: pagedRowsError } = await supabase
          .from("vendors")
          .select("*")
          .in("id", pagedIds);

        if (pagedRowsError) {
          return res.status(500).json({ error: pagedRowsError.message });
        }

        const vendorById = new Map((pagedRows || []).map((vendor) => [String(vendor.id), vendor]));
        pagedData = pagedIds
          .map((id) => vendorById.get(id))
          .filter(Boolean);
      }

      const total = filtered.length;
      const enrichedData = await enrichVendorsWithRatings(pagedData);

      const payload = {
        data: enrichedData,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total
        }
      };

      writeResponseCache(cacheKey, payload);

      logRouteTiming("GET /vendors", startedAtMs, {
        cache: "miss",
        includeAll,
        limit,
        offset,
        serviceId: serviceId || null,
        candidates: Array.isArray(candidates) ? candidates.length : 0,
        total,
        rows: enrichedData.length,
      });

      return res.status(200).json(payload);
    }

    query = query.select("*", { count: "planned" });
    let queryResult = await query.range(offset, offset + limit - 1);
    let { data, error, count } = queryResult;

    if (!includeAll && error && String(error.message || "").toLowerCase().includes("approval_status")) {
      // Backward-compatible fallback in case approval_status column is not added yet.
      const fallback = await supabase
        .from("vendors")
        .select("*", { count: "planned" })
        .eq("is_active", true)
        .range(offset, offset + limit - 1);

      data = fallback.data;
      error = fallback.error;
      count = fallback.count;
    }

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!includeAll) {
      const filtered = (data || []).filter((vendor) => isVendorApproved(vendor));
      const enrichedData = await enrichVendorsWithRatings(filtered);

      const payload = {
        data: enrichedData,
        pagination: {
          limit,
          offset,
          total: count,
          hasMore: offset + limit < count
        }
      };

      writeResponseCache(cacheKey, payload);
      logRouteTiming("GET /vendors", startedAtMs, {
        cache: "miss",
        includeAll,
        limit,
        offset,
        serviceId: serviceId || null,
        total: count,
        rows: enrichedData.length,
      });
      return res.status(200).json(payload);
    }

    const enrichedData = await enrichVendorsWithRatings(data || []);

    const payload = {
      data: enrichedData,
      pagination: {
        limit,
        offset,
        total: count,
        hasMore: offset + limit < count
      }
    };

    writeResponseCache(cacheKey, payload);
    logRouteTiming("GET /vendors", startedAtMs, {
      cache: "miss",
      includeAll,
      limit,
      offset,
      serviceId: serviceId || null,
      total: count,
      rows: enrichedData.length,
    });
    return res.status(200).json(payload);
  } catch (err) {
    logRouteTiming("GET /vendors", startedAtMs, {
      cache: "error",
      message: err.message,
    });
    return res.status(500).json({ error: err.message });
  }
});

app.get("/vendors/:id", async (req, res) => {
  try {
    const vendorId = req.params.id;

    if (!vendorId) {
      return res.status(400).json({ error: "Vendor ID is required" });
    }

    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", vendorId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Check if vendor is approved - if not, only include certain fields
    if (!isVendorApproved(data)) {
      return res.status(403).json({ error: "Vendor is not approved" });
    }

    const enrichedVendor = await enrichVendorsWithRatings([data]);

    return res.status(200).json({ data: enrichedVendor[0] });
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

    let payload = { ...updatePayload };
    let data = null;
    let error = null;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await supabase
        .from("vendors")
        .update(payload)
        .eq("id", vendorId)
        .select("*")
        .single();

      data = response.data;
      error = response.error;

      if (!error) {
        break;
      }

      if (!isSchemaColumnCompatibilityError(error)) {
        break;
      }

      const missingColumn = extractMissingColumnFromSchemaError(error);
      if (!missingColumn || !(missingColumn in payload)) {
        break;
      }

      delete payload[missingColumn];

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: "No compatible fields provided to update" });
      }
    }

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

    // Remove FK references from historical/current bookings before vendor deletion.
    const { error: unassignBookingsError } = await supabase
      .from("bookings")
      .update({ vendor_id: null })
      .eq("vendor_id", vendorId);

    if (unassignBookingsError) {
      return res.status(500).json({ error: unassignBookingsError.message });
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
  const startedAtMs = nowMs();
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const cacheKey = ["services", limit, offset].join("|");
    const cachedPayload = readResponseCache(cacheKey, SERVICES_CACHE_TTL_MS);

    if (cachedPayload) {
      logRouteTiming("GET /services", startedAtMs, {
        cache: "hit",
        limit,
        offset,
      });
      return res.status(200).json(cachedPayload);
    }

    const { data, error, count } = await supabase
      .from("services")
      .select("*", { count: "planned" })
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Supabase Fetch Error:", error);
      return res.status(500).json({ error: error.message });
    }

    const payload = {
      data,
      pagination: {
        limit,
        offset,
        total: count,
        hasMore: offset + limit < count
      }
    };

    writeResponseCache(cacheKey, payload);
    logRouteTiming("GET /services", startedAtMs, {
      cache: "miss",
      limit,
      offset,
      total: count,
      rows: Array.isArray(data) ? data.length : 0,
    });
    return res.status(200).json(payload);
  } catch (err) {
    console.error("Server Crash:", err);
    logRouteTiming("GET /services", startedAtMs, {
      cache: "error",
      message: err.message,
    });
    return res.status(500).json({ error: err.message });
  }
});

app.get("/services/:id", async (req, res) => {
  try {
    const serviceId = req.params.id;

    if (!serviceId) {
      return res.status(400).json({ error: "Service ID is required" });
    }

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.status(200).json({ data });
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

    invalidateResponseCacheByPrefix("services|");

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

    const { data: existingService, error: existingServiceError } = await supabase
      .from("services")
      .select("id, name")
      .eq("id", serviceId)
      .single();

    if (existingServiceError || !existingService) {
      return res.status(404).json({ error: "Service not found" });
    }

    const previousServiceName = String(existingService.name || "").trim();

    const { data, error } = await supabase
      .from("services")
      .update(payload)
      .eq("id", serviceId)
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    invalidateResponseCacheByPrefix("services|");

    const updatedServiceName = String(data?.name || payload.name || previousServiceName || "").trim();
    const serviceNameChanged =
      Boolean(previousServiceName && updatedServiceName) &&
      normalizeVendorServiceText(previousServiceName) !== normalizeVendorServiceText(updatedServiceName);

    if (serviceNameChanged) {
      const normalizedPreviousName = normalizeVendorServiceText(previousServiceName);
      const normalizedUpdatedName = updatedServiceName;

      const vendorSelectColumns = "id, service_id, service_ids, selected_service_names";
      const [serviceIdMatches, serviceIdsMatches, serviceNameMatches] = await Promise.all([
        supabase
          .from("vendors")
          .select(vendorSelectColumns)
          .eq("service_id", serviceId),
        supabase
          .from("vendors")
          .select(vendorSelectColumns)
          .contains("service_ids", [serviceId]),
        previousServiceName
          ? supabase
              .from("vendors")
              .select(vendorSelectColumns)
              .contains("selected_service_names", [previousServiceName])
          : Promise.resolve({ data: [], error: null }),
      ]);

      const vendorRows = [
        ...(serviceIdMatches.data || []),
        ...(serviceIdsMatches.data || []),
        ...(serviceNameMatches.data || []),
      ].filter(Boolean);

      const vendorById = new Map();
      for (const vendor of vendorRows) {
        vendorById.set(String(vendor.id), vendor);
      }

      const vendorUpdates = [];
      for (const vendor of vendorById.values()) {
        const selectedNames = parseVendorListField(vendor.selected_service_names);
        const serviceIds = parseVendorListField(vendor.service_ids);
        const matchesByServiceId = String(vendor.service_id || "").trim() === String(serviceId).trim();
        const matchesByServiceIds = serviceIds.includes(String(serviceId).trim());
        const matchesByName = selectedNames.some((name) => normalizeVendorServiceText(name) === normalizedPreviousName);

        if (!matchesByServiceId && !matchesByServiceIds && !matchesByName) {
          continue;
        }

        const nextNames = [];
        const seen = new Set();

        for (const name of selectedNames) {
          const trimmedName = String(name || "").trim();
          if (!trimmedName) {
            continue;
          }

          const nextName = normalizeVendorServiceText(trimmedName) === normalizedPreviousName ? normalizedUpdatedName : trimmedName;
          const normalizedNextName = normalizeVendorServiceText(nextName);
          if (!normalizedNextName || seen.has(normalizedNextName)) {
            continue;
          }

          seen.add(normalizedNextName);
          nextNames.push(nextName);
        }

        const normalizedUpdatedNameKey = normalizeVendorServiceText(normalizedUpdatedName);
        if (normalizedUpdatedNameKey && !seen.has(normalizedUpdatedNameKey)) {
          nextNames.push(normalizedUpdatedName);
        }

        const currentKeys = selectedNames.map((name) => normalizeVendorServiceText(name)).filter(Boolean);
        const nextKeys = nextNames.map((name) => normalizeVendorServiceText(name)).filter(Boolean);
        const hasChanged = currentKeys.length !== nextKeys.length || currentKeys.some((key, index) => key !== nextKeys[index]);

        if (hasChanged) {
          vendorUpdates.push(
            supabase
              .from("vendors")
              .update({ selected_service_names: nextNames })
              .eq("id", vendor.id)
          );
        }
      }

      if (vendorUpdates.length > 0) {
        const updateResults = await Promise.all(vendorUpdates);
        const vendorUpdateError = updateResults.find((result) => result.error)?.error || null;
        if (vendorUpdateError) {
          return res.status(500).json({ error: vendorUpdateError.message });
        }

        invalidateResponseCacheByPrefix("vendors|");
      }
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

    invalidateResponseCacheByPrefix("services|");

    return res.status(200).json({ message: "Service deleted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



app.get("/vendors/:auth_id/bookings", async (req, res) => {

  const vendorIdentifier = String(req.params.auth_id || "").trim();
  if (!vendorIdentifier) {
    return res.status(400).json({ error: "Vendor identifier is required" });
  }

  const limit = Math.min(parseInt(req.query.limit) || 100, 200);

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, auth_user_id, service_id, service_ids, is_active, approval_status")
    .or(`auth_user_id.eq.${vendorIdentifier},id.eq.${vendorIdentifier}`)
    .single();

  if (vendorError || !vendor) {
    return res.status(404).json({ error: "Vendor not found" });
  }

  if (!isVendorApproved(vendor)) {
    return res.json({ data: [], pagination: { total: 0, hasMore: false } });
  }

  const offeredServiceIds = Array.from(
    new Set(
      [vendor.service_id, ...parseVendorListField(vendor.service_ids)]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );

  const offeredServiceNameKeys = Array.from(
    new Set(
      parseVendorListField(vendor.selected_service_names)
        .map((name) => getVendorServiceKey(name))
        .filter(Boolean)
    )
  );

  const resolvedVendorAuthId = String(vendor.auth_user_id || "").trim();

  const { data: assignedBookings, error: assignedBookingsError } = await supabase
    .from("bookings")
    .select("*")
    .or(
      resolvedVendorAuthId
        ? `vendor_auth_id.eq.${resolvedVendorAuthId},vendor_id.eq.${vendor.id}`
        : `vendor_id.eq.${vendor.id}`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (assignedBookingsError) {
    return res.status(500).json(assignedBookingsError);
  }

  let pendingBookings = [];
  if (offeredServiceIds.length > 0 || offeredServiceNameKeys.length > 0) {
    let pendingQuery = supabase
      .from("bookings")
      .select("*")
      .eq("status", "pending")
      .is("vendor_id", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data: pendingRows, error: pendingError } = await pendingQuery;

    if (pendingError) {
      return res.status(500).json(pendingError);
    }

    pendingBookings = (pendingRows || []).filter((booking) => {
      const bookingServiceId = String(booking?.service_id || "").trim();
      const bookingServiceName = String(booking?.services?.name || booking?.service_name || "").trim();
      const bookingServiceKey = bookingServiceName ? getVendorServiceKey(bookingServiceName) : "";

      const serviceIdMatch = offeredServiceIds.length > 0 && offeredServiceIds.includes(bookingServiceId);
      const serviceNameMatch = bookingServiceKey && offeredServiceNameKeys.includes(bookingServiceKey);

      return serviceIdMatch || serviceNameMatch;
    });
  }

  const bookings = [...(assignedBookings || []), ...pendingBookings];

  // Deduplicate in case of overlaps
  const seenIds = new Set();
  const dedupedBookings = (bookings || []).filter(booking => {
    if (seenIds.has(booking.id)) {
      return false;
    }
    seenIds.add(booking.id);
    return true;
  });

  res.json({
    data: dedupedBookings,
    pagination: {
      total: dedupedBookings.length,
      hasMore: dedupedBookings.length >= limit
    }
  });
});

app.post("/payments/create-order", async (req, res) => {
  try {
    const method = normalizePaymentMethod(req.body?.method);
    const amount = Number(req.body?.amount || 0);
    const currency = String(req.body?.currency || "INR").toUpperCase();
    const customer = req.body?.customer || {};
    const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};

    if (!SUPPORTED_PAYMENT_METHODS.has(method)) {
      return res.status(400).json({
        ok: false,
        provider: ONLINE_PROVIDER,
        message: "Unsupported payment method",
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        ok: false,
        provider: ONLINE_PROVIDER,
        message: "Amount must be greater than zero",
      });
    }

    if (!customer.userId || !customer.name || !customer.phone) {
      return res.status(400).json({
        ok: false,
        provider: ONLINE_PROVIDER,
        message: "Customer userId, name, and phone are required",
      });
    }

    if (method === "cod") {
      const providerOrderId = `cod_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      paymentOrderStore.set(providerOrderId, {
        method,
        amount,
        currency,
        metadata,
        customer,
        createdAt: Date.now(),
        verified: true,
      });

      return res.status(200).json({
        ok: true,
        provider: COD_PROVIDER,
        providerOrderId,
        metadata,
        message: "COD order initialized",
      });
    }

    if (!razorpayClient) {
      return res.status(503).json({
        ok: false,
        provider: ONLINE_PROVIDER,
        message: "Online payments are not configured on server",
      });
    }

    const amountInPaise = Math.round(amount * 100);
    const receipt = `sg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const order = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes: {
        userId: String(customer.userId || "").slice(0, 40),
        customerName: String(customer.name || "").slice(0, 120),
        customerPhone: String(customer.phone || "").slice(0, 20),
        serviceId: String(metadata.serviceId || "").slice(0, 40),
        vendorId: String(metadata.vendorId || "").slice(0, 40),
      },
    });

    return res.status(200).json({
      ok: true,
      provider: ONLINE_PROVIDER,
      keyId: RAZORPAY_KEY_ID,
      providerOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      metadata,
      message: "Online order initialized",
    });
  } catch (err) {
    console.error("Payment create-order crash:", err);
    return res.status(500).json({
      ok: false,
      provider: ONLINE_PROVIDER,
      message: err.message || "Failed to create payment order",
    });
  }
});

app.post("/payments/verify", async (req, res) => {
  try {
    const method = normalizePaymentMethod(req.body?.method);
    const providerOrderId = String(req.body?.providerOrderId || "").trim();
    const providerPaymentId = String(req.body?.providerPaymentId || "").trim();
    const signature = String(req.body?.signature || "").trim();

    if (!SUPPORTED_PAYMENT_METHODS.has(method)) {
      return res.status(400).json({
        verified: false,
        provider: ONLINE_PROVIDER,
        message: "Unsupported payment method",
      });
    }

    if (method === "cod") {
      return res.status(200).json({
        verified: true,
        provider: COD_PROVIDER,
        message: "COD does not require online verification",
      });
    }

    if (!providerOrderId || !providerPaymentId || !signature) {
      return res.status(400).json({
        verified: false,
        provider: ONLINE_PROVIDER,
        message: "providerOrderId, providerPaymentId, and signature are required",
      });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        verified: false,
        provider: ONLINE_PROVIDER,
        message: "Online payment verification is not configured",
      });
    }

    const expectedSignature = createRazorpaySignature(providerOrderId, providerPaymentId);
    if (signature !== expectedSignature) {
      return res.status(400).json({
        verified: false,
        provider: ONLINE_PROVIDER,
        message: "Payment verification failed",
      });
    }

    return res.status(200).json({
      verified: true,
      provider: ONLINE_PROVIDER,
      message: "Payment verified successfully",
    });
  } catch (err) {
    console.error("Payment verify crash:", err);
    return res.status(500).json({
      verified: false,
      provider: ONLINE_PROVIDER,
      message: err.message || "Payment verification failed",
    });
  }
});

app.post("/push/subscribe", async (req, res) => {
  try {
    const { vendor_auth_id, subscription } = req.body;

    if (!vendor_auth_id || !subscription?.endpoint) {
      return res.status(400).json({ error: "Vendor auth ID and push subscription are required" });
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendors")
      .select("auth_user_id, service_id, approval_status")
      .eq("auth_user_id", vendor_auth_id)
      .single();

    if (vendorError || !vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    if (!isVendorApproved(vendor)) {
      return res.status(403).json({ error: "Vendor is pending admin approval" });
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

// Admin endpoint to update services with accurate subservices
app.post("/admin/update-services-subservices", async (req, res) => {
  try {
    const adminToken = req.headers["x-admin-token"];
    const expectedToken = process.env.ADMIN_TOKEN || "admin-servicego-update";

    if (!adminToken || adminToken !== expectedToken) {
      return res.status(403).json({ error: "Unauthorized: invalid admin token" });
    }

    const subservicesConfig = {
      ac: [
        "AC Foam Jet Service",
        "General AC Service",
        "Gas Refilling Service",
        "AC Check-up & Diagnosis",
        "AC Installation",
        "AC Uninstallation",
      ],
      washing_machine: [
        "Semi-Auto WM Check-up",
        "Top Load WM Check-up",
        "Front Load WM Check-up",
        "Top Load Normal Cleaning",
        "Top Load Deep Cleaning",
        "Front Load Normal Cleaning",
        "Front Load Deep Cleaning",
      ],
      ro: [
        "RO Purifier Check-up",
        "RO Annual Care Plan (12 Months)",
        "Standard RO Service",
      ],
      microwave: [
        "Microwave Check-up",
        "Magnetron Replacement",
        "Microwave PCB Service",
      ],
      geyser: [
        "Geyser Installation",
        "Geyser Uninstallation",
        "Geyser Check-up & Diagnosis",
      ],
      chimney: [
        "Chimney Check-up",
        "Chimney Installation",
        "Chimney Uninstallation",
        "Chimney Normal Cleaning",
        "Chimney Deep Cleaning",
      ],
      fridge: [
        "Fridge Check-up & Diagnosis",
        "Single Door Fridge Gas Charging",
        "Double Door Fridge Gas Charging",
        "Side-by-Side (Almirah) Fridge Check-up",
      ],
      cooler: [
        "Air Cooler Check-up",
        "Cooler Pad Replacement",
      ],
    };

    const results = [];

    for (const [serviceKey, subservices] of Object.entries(subservicesConfig)) {
      const matchPatterns = {
        ac: /^ac$/i,
        washing_machine: /washing.*machine|machine.*wash/i,
        ro: /^ro$|purifier|water.*filter/i,
        microwave: /microwave/i,
        geyser: /geyser|water.*heater/i,
        chimney: /chimney|kitchen.*chimney/i,
        fridge: /fridge|refrigerator/i,
        cooler: /cooler|air.*cooler/i,
      };

      const pattern = matchPatterns[serviceKey];
      if (!pattern) continue;

      const { data: allServicesForKey, error: fetchError } = await supabase
        .from("services")
        .select("id, name")
        .eq("is_active", true);

      if (fetchError || !allServicesForKey) {
        results.push({
          service: serviceKey,
          status: "skipped",
          reason: fetchError ? fetchError.message : "Service fetch failed",
        });
        continue;
      }

      const service = (allServicesForKey || []).find((s) =>
        pattern.test(s.name || "")
      );

      if (!service) {
        results.push({
          service: serviceKey,
          status: "skipped",
          reason: "Service not found matching pattern",
        });
        continue;
      }

      const { error: updateError } = await supabase
        .from("services")
        .update({ sub_services: subservices })
        .eq("id", service.id);

      if (updateError) {
        results.push({
          service: serviceKey,
          serviceId: service.id,
          status: "error",
          error: updateError.message,
        });
        continue;
      }

      invalidateResponseCacheByPrefix("services|");

      results.push({
        service: serviceKey,
        serviceId: service.id,
        serviceName: service.name,
        status: "updated",
        subserviceCount: subservices.length,
      });
    }

    const { data: allServices, error: verifyError } = await supabase
      .from("services")
      .select("id, name, sub_services")
      .eq("is_active", true)
      .order("name", { ascending: true });

    return res.status(200).json({
      message: "Services subservices update completed",
      updateResults: results,
      verifyServices: verifyError ? null : allServices,
    });
  } catch (err) {
    console.error("Admin update services failure:", err);
    return res.status(500).json({
      error: err.message || "Failed to update services subservices",
    });
  }
});

// Render provides PORT at runtime; fallback keeps local dev unchanged.
const PORT = process.env.PORT || 5000;

// 🚀 Server should ALWAYS be last
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  warmServicesResponseCache().catch((error) => {
    console.error("Initial services cache warmup failed:", error.message || error);
  });

  setInterval(() => {
    warmServicesResponseCache().catch((error) => {
      console.error("Scheduled services cache warmup failed:", error.message || error);
    });
  }, 4 * 60 * 1000);
});

