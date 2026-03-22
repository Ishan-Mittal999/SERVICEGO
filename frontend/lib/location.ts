export type UserLocation = {
  lat: number;
  lng: number;
  city: string;
  area: string;
  postcode: string;
  state: string;
  country: string;
  fullAddress: string;
  savedAt: string;
};

export type VendorLocation = {
  lat: number;
  lng: number;
  source: "stored" | "geocoded";
  label: string;
  savedAt: string;
};

type VendorLocationCache = Record<string, VendorLocation>;

type NominatimReverseResponse = {
  display_name?: string;
  address?: {
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

type NominatimSearchResponse = Array<{
  lat: string;
  lon: string;
  display_name?: string;
}>;

const USER_LOCATION_KEY = "servicego-user-location-v1";
const VENDOR_LOCATION_CACHE_KEY = "servicego-vendor-location-cache-v1";

function canUseStorage() {
  return typeof window !== "undefined";
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readUserLocation() {
  if (!canUseStorage()) {
    return null;
  }

  const location = safeParse<UserLocation>(window.localStorage.getItem(USER_LOCATION_KEY));
  if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
    return null;
  }

  return location;
}

export function writeUserLocation(location: UserLocation) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(USER_LOCATION_KEY, JSON.stringify(location));
}

export function readVendorLocationCache(): VendorLocationCache {
  if (!canUseStorage()) {
    return {};
  }

  const parsed = safeParse<VendorLocationCache>(window.localStorage.getItem(VENDOR_LOCATION_CACHE_KEY));
  return parsed && typeof parsed === "object" ? parsed : {};
}

export function getVendorLocation(vendorId: string) {
  const cache = readVendorLocationCache();
  return cache[vendorId] ?? null;
}

export function saveVendorLocation(vendorId: string, location: VendorLocation) {
  if (!canUseStorage()) {
    return;
  }

  const cache = readVendorLocationCache();
  cache[vendorId] = location;
  window.localStorage.setItem(VENDOR_LOCATION_CACHE_KEY, JSON.stringify(cache));
}

export function parseCoordinatesFromArea(area: string) {
  const match = area.match(/lat\s*([+-]?\d+(?:\.\d+)?)\s*,?\s*lng\s*([+-]?\d+(?:\.\d+)?)/i);
  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

export async function reverseGeocode(lat: number, lng: number) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
    {
      headers: {
        "Accept-Language": "en",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.status}`);
  }

  const data = (await response.json()) as NominatimReverseResponse;
  return data;
}

export async function geocodeArea(area: string) {
  if (!area.trim()) {
    return null;
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(area)}`,
    {
      headers: {
        "Accept-Language": "en",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as NominatimSearchResponse;
  const first = data[0];

  if (!first) {
    return null;
  }

  const lat = Number(first.lat);
  const lng = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    label: first.display_name || area,
  };
}

export async function detectUserLocation() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported by this browser.");
  }

  if (
    typeof window !== "undefined" &&
    !window.isSecureContext &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    throw new Error("Location requires a secure HTTPS connection. Please reopen the app on HTTPS and try again.");
  }

  const permissionState = await getGeolocationPermissionState();
  if (permissionState === "denied") {
    throw new Error("Location access is blocked. Enable location permission for this site in browser settings and try again.");
  }

  const attemptOptions: PositionOptions[] = [
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    },
    {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 300000,
    },
  ];

  let coords: GeolocationCoordinates | null = null;
  let lastError: unknown = null;

  for (const options of attemptOptions) {
    try {
      coords = await getCurrentPositionWithOptions(options);
      break;
    } catch (error) {
      lastError = error;

      if (isGeolocationError(error) && error.code === 1) {
        break;
      }
    }
  }

  if (!coords) {
    throw normalizeGeolocationError(lastError);
  }

  const reverse = await reverseGeocode(coords.latitude, coords.longitude);
  const address = reverse.address || {};

  const city = address.city || address.town || address.village || "";
  const area = address.suburb || address.neighbourhood || city;

  return {
    lat: coords.latitude,
    lng: coords.longitude,
    city,
    area,
    postcode: address.postcode || "",
    state: address.state || "",
    country: address.country || "",
    fullAddress: reverse.display_name || "",
    savedAt: new Date().toISOString(),
  } as UserLocation;
}

function getCurrentPositionWithOptions(options: PositionOptions) {
  return new Promise<GeolocationCoordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => reject(error),
      options
    );
  });
}

async function getGeolocationPermissionState(): Promise<"granted" | "prompt" | "denied" | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions || !navigator.permissions.query) {
    return "unknown";
  }

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

function isGeolocationError(value: unknown): value is GeolocationPositionError {
  return Boolean(
    value &&
      typeof value === "object" &&
      "code" in value &&
      typeof (value as { code?: unknown }).code === "number"
  );
}

function normalizeGeolocationError(error: unknown) {
  if (isGeolocationError(error)) {
    if (error.code === 1) {
      return new Error("Location permission was denied. Enable location access in browser settings and try again.");
    }

    if (error.code === 2) {
      return new Error("Location is temporarily unavailable. Move to an open area or stronger network and try again.");
    }

    if (error.code === 3) {
      return new Error("Location request timed out. Please try again.");
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  return new Error("Unable to detect location right now.");
}

export function distanceInKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
