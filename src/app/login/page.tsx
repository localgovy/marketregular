import { cookies } from "next/headers";
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
import { cookieLooksLikeSupabaseAuth } from "@/lib/supabase/auth-cookie";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { siteCopy } from "@/content/site-copy";
import { pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const maxDuration = 30;

export const metadata: Metadata = pageMeta({
  title: siteCopy["/login"].title,
  path: "/login",
  description: siteCopy["/login"].description,
  index: false,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: raw, error: oauthError } = await searchParams;
  const next = safePath(raw);
  const jar = await cookies();
  const authed = jar.getAll().some((cookie) => cookieLooksLikeSupabaseAuth(cookie.name));
  if (authed) {
    const [profile, session] = await Promise.all([
      getCurrentProfile(),
      createAuthedServerClient(),
    ]);
    if (profile) {
      const skip =
        isVendorPortalPath(next) ||
        isMarketPortalPath(next) ||
        isStallCheckoutPath(next) ||
        (session.supabase ? await skipsShopperOnboarding(session.supabase, profile) : false);
      redirect(skip ? next : onboardingHref(next));
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <BackButton href="/" />
      <h1>{siteCopy["/login"].h1}</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        {isStallCheckoutPath(next) ? siteCopy["/login"].ledeCheckout : siteCopy["/login"].lede}
      </p>
      <LoginForm
        next={next}
        oauthError={loginQueryError(oauthError)}
      />
    </div>
  );
}
