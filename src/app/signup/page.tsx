import { BackButton } from "@/components/back-button";
import { SignupForm } from "@/components/signup-form";
import { safePath } from "@/lib/auth-redirect";
import { getCurrentProfile } from "@/lib/data/catalog";
import {
  isMarketPortalPath,
  isStallCheckoutPath,
  isVendorPortalPath,
  onboardingHref,
  skipsShopperOnboarding,
} from "@/lib/onboarding";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "Create an account",
  path: "/signup",
  description: "Create an account to save markets across browsers and post reviews.",
  index: false,
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next: raw }, profile, session] = await Promise.all([
    searchParams,
    getCurrentProfile(),
    createAuthedServerClient(),
  ]);
  const next = safePath(raw);
  if (profile) {
    const skip =
      isVendorPortalPath(next) ||
      isMarketPortalPath(next) ||
      isStallCheckoutPath(next) ||
      (session.supabase ? await skipsShopperOnboarding(session.supabase, profile) : false);
    redirect(skip ? next : onboardingHref(next));
  }

  const loginHref =
    next && next !== "/account" ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <BackButton href={loginHref} />
      <h1>Create an account</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        A name for posts, then email and a password — or continue with Google.
      </p>
      <SignupForm next={next} />
    </div>
  );
}
