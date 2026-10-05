import { safePath } from "@/lib/auth-redirect";
import type { Profile } from "@/types/database";

export function needsOnboarding(profile: Pick<Profile, "onboarded_at" | "role"> | null) {
  if (!profile) return true;
  if (profile.role === "vendor") return false;
  return !profile.onboarded_at;
}

type PortalWaitClient = {
  rpc: (
    fn: string,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

/** A stall or market owner, or someone waiting on a portal account, skips shopper onboarding. */
export async function skipsShopperOnboarding(
  supabase: PortalWaitClient,
  profile: Pick<Profile, "onboarded_at" | "role"> | null,
) {
  if (!needsOnboarding(profile)) return true;
  const [vendor, market] = await Promise.all([
    supabase.rpc("awaiting_vendor_portal"),
    supabase.rpc("awaiting_market_portal"),
  ]);
  return (!vendor.error && vendor.data === true) || (!market.error && market.data === true);
}

export function isVendorPortalPath(path: string) {
  const bare = path.split("?")[0]?.split("#")[0] ?? path;
  return bare === "/vendor" || bare.startsWith("/vendor/");
}

export function isMarketPortalPath(path: string) {
  const bare = path.split("?")[0]?.split("#")[0] ?? path;
  return bare === "/market" || bare.startsWith("/market/");
}

/** Buying and the receipt stay open before the shopper profile is finished. */
export function isStallCheckoutPath(path: string) {
  const bare = path.split("?")[0]?.split("#")[0] ?? path;
  return /^\/vendors\/[^/]+\/(?:buy|orders)\//.test(bare);
}

export function onboardingExemptPath(path: string) {
  return (
    path === "/onboarding" ||
    path.startsWith("/auth/") ||
    path === "/login" ||
    path === "/signup" ||
    path === "/account/password" ||
    path === "/privacy" ||
    path === "/terms" ||
    isVendorPortalPath(path) ||
    isMarketPortalPath(path) ||
    isStallCheckoutPath(path)
  );
}

export function onboardingHref(next: unknown) {
  const path = safePath(next);
  if (path === "/account" || path === "/onboarding") return "/onboarding";
  return `/onboarding?next=${encodeURIComponent(path)}`;
}
