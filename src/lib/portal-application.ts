import type { ClaimTarget } from "@/types/database";

export const PORTAL_ORG_COOKIE = "mr-portal-org";
export const PORTAL_ORG_MAX = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function portalOrgCookieOptions() {
  return {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function portalRequestId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : "";
  return UUID.test(id) ? id : null;
}

export function portalKind(value: unknown): ClaimTarget | null {
  return value === "vendor" || value === "market" ? value : null;
}

/** Portal index, keeping a listing request on the query string. */
export function portalHomePath(kind: ClaimTarget, requestId?: string | null) {
  const base = kind === "market" ? "/market" : "/vendor";
  const id = portalRequestId(requestId);
  return id ? `${base}?request=${id}` : base;
}

export function clipOrganizationName(value: unknown) {
  const name = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, PORTAL_ORG_MAX);
  return name.length ? name : null;
}

export function encodePortalOrgCookie(name: string) {
  return encodeURIComponent(name);
}

export function decodePortalOrgCookie(value: string | undefined) {
  if (!value) return null;
  try {
    return clipOrganizationName(decodeURIComponent(value));
  } catch {
    return null;
  }
}
