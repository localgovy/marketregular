import { SITE_URL } from "@/lib/constants";
import { isTrustedSiteHost } from "@/lib/site-host";

const SAFE_PATH = /^\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%\-]*$/;

export const AUTH_NEXT_COOKIE = "mr-auth-next";

export function safePath(next: unknown, fallback = "/account") {
  if (typeof next !== "string") return fallback;
  const value = next.trim();
  if (!value || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || value.includes("://")) return fallback;
  if (!SAFE_PATH.test(value)) return fallback;
  return value;
}

export function authNextCookie(next: string) {
  return `${AUTH_NEXT_COOKIE}=${encodeURIComponent(safePath(next))}; Path=/; Max-Age=600; SameSite=Lax`;
}

export function readAuthNextCookie() {
  if (typeof document === "undefined") return null;
  const prefix = `${AUTH_NEXT_COOKIE}=`;
  const part = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));
  if (!part) return null;
  try {
    return safePath(decodeURIComponent(part.slice(prefix.length)));
  } catch {
    return null;
  }
}

export function clearAuthNextCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function isTrustedAuthHost(hostname: string) {
  return isTrustedSiteHost(hostname);
}

/** Stay on the host that handled the callback when that host is ours. */
export function callbackOrigin(request: { nextUrl: URL }) {
  const { hostname, origin } = request.nextUrl;
  if (!isTrustedAuthHost(hostname)) return authOrigin();
  if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  const host = hostname === "marketregular.com" ? "www.marketregular.com" : hostname;
  return `https://${host}`;
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
