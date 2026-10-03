import { OnboardingDesk } from "@/components/onboarding-desk";
import { loadAccountDesk } from "@/lib/data/account";
import { getCurrentProfile, listMarkets, listSchedules } from "@/lib/data/catalog";
import { needsOnboarding, skipsShopperOnboarding } from "@/lib/onboarding";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { safePath } from "@/lib/auth-redirect";
import { nextOpenLabel } from "@/lib/schedule";
import { pageMeta } from "@/lib/seo";
import { SITE_NAME } from "@/lib/constants";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { MarketSchedule } from "@/types/database";

export const metadata: Metadata = pageMeta({
  title: "Set up your profile",
  path: "/onboarding",
  description: `Pick a handle and three ${SITE_NAME} markets.`,
  index: false,
});

export default async function OnboardingPage({
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
  if (!profile) redirect("/login?next=/onboarding");
  if (!needsOnboarding(profile)) redirect(next === "/onboarding" ? "/account" : next);
  if (session.supabase && (await skipsShopperOnboarding(session.supabase, profile))) {
    redirect(next === "/account" || next === "/onboarding" ? "/vendor" : next);
  }

  const desk = await loadAccountDesk(profile.id);
  const [markets, schedules] = await Promise.all([listMarkets(), listSchedules()]);
  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }

  return (
    <OnboardingDesk
      displayName={profile.display_name?.trim() || ""}
      email={desk.email}
      next={next === "/onboarding" ? "/account" : next}
      visitPlanEmailedAt={desk.visitPlanEmailedAt}
      markets={markets.map((market) => ({
        slug: market.slug,
        name: market.name,
        city: market.city,
        address: market.address,
        hours: nextOpenLabel(scheduleMap.get(market.id) ?? [], market.province),
      }))}
    />
  );
}
