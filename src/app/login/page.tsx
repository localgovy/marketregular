import { BackButton } from "@/components/back-button";
import { LoginForm } from "@/components/login-form";
import { safePath } from "@/lib/auth-redirect";
import { getCurrentProfile } from "@/lib/data/catalog";
import { loginQueryError } from "@/lib/public-error";
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
  title: "Sign in",
  path: "/login",
  description: "Sign in to save markets across browsers and post reviews.",
  index: false,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [{ next: raw, error: oauthError }, profile, session] = await Promise.all([
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

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <BackButton href="/" />
      <h1>Sign in</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        Saved markets and reviews follow this account. Browsing stays open.
      </p>
      <LoginForm
        next={next}
        oauthError={loginQueryError(oauthError)}
      />
    </div>
  );
}
