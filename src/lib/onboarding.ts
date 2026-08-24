import { safePath } from "@/lib/auth-redirect";
import type { Profile } from "@/types/database";

export function needsOnboarding(profile: Pick<Profile, "onboarded_at"> | null) {
  if (!profile) return false;
  return !profile.onboarded_at;
}

export function onboardingExemptPath(path: string) {
  return (
    path === "/onboarding" ||
    path.startsWith("/auth/") ||
    path === "/login" ||
    path === "/signup" ||
    path === "/account/password"
  );
}

export function onboardingHref(next: unknown) {
  const path = safePath(next);
  if (path === "/account" || path === "/onboarding") return "/onboarding";
  return `/onboarding?next=${encodeURIComponent(path)}`;
}
