import { SITE_URL } from "@/lib/constants";

const SAFE_PATH = /^\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%\-]*$/;

export function safePath(next: unknown, fallback = "/account") {
  if (typeof next !== "string") return fallback;
  const value = next.trim();
  if (!value || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("://")) return fallback;
  if (!SAFE_PATH.test(value)) return fallback;
  return value;
}

/** Magic-link / OAuth redirect origin. Never taken from forwarded Host headers. */
export function authOrigin() {
  if (process.env.NODE_ENV === "development") {
    const raw = process.env.NEXT_PUBLIC_SITE_URL;
    if (raw) {
      try {
        const url = new URL(raw);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          return url.origin;
        }
      } catch {
        // use the local default
      }
    }
    return "http://localhost:3000";
  }
  return SITE_URL;
}
