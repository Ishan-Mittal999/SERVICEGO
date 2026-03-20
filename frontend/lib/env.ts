const apiBaseFromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

const fallbackApiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://servicego-backnd.onrender.com";

export const API_BASE_URL = (
  apiBaseFromEnv && apiBaseFromEnv.length > 0
    ? apiBaseFromEnv
    : fallbackApiBaseUrl
).replace(/\/$/, "");

export const WEB_PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim() || "";

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
