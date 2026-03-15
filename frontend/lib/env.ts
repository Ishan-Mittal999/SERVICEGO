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

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
