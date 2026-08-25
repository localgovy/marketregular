import { AccountDesk } from "@/components/account-desk";
import {
  getCurrentProfile,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { loadAccountDesk } from "@/lib/data/account";
import { toGeoMarket } from "@/lib/geo";
import { nextOpenLabel } from "@/lib/schedule";
import { upcomingByDay } from "@/lib/upcoming";
import { savedVendorsSellingToday, savedVendorsThisWeek } from "@/lib/vendor-week";
import { SITE_NAME } from "@/lib/constants";
import { needsOnboarding, onboardingHref } from "@/lib/onboarding";
import { pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { MarketSchedule } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Account",
  path: "/account",
  description: `Your ${SITE_NAME} account — saved markets, this week’s hours, and reviews.`,
  index: false,
});

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/account");
  if (needsOnboarding(profile)) redirect(onboardingHref("/account"));

  const [desk, markets, vendors, stalls, schedules] = await Promise.all([
    loadAccountDesk(profile.id),
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
  ]);

  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }

  const nextHours: Record<string, string> = {};
  for (const market of markets) {
    const hours = nextOpenLabel(scheduleMap.get(market.id) ?? [], market.province);
    if (hours) nextHours[market.slug] = hours;
  }

  const saves = desk.saves;

  const stallWeek = savedVendorsThisWeek(
    saves.vendors,
    stalls,
    markets,
    vendors,
    scheduleMap,
  );
  const sellingToday = savedVendorsSellingToday(
    saves.vendors,
    stalls,
    markets,
    vendors,
    scheduleMap,
  );

  const weekSlugs = new Set(saves.markets);
  for (const pick of stallWeek) {
    for (const place of pick.where) weekSlugs.add(place.marketSlug);
  }
  const weekMarkets = markets.filter((market) => weekSlugs.has(market.slug));
  const week = upcomingByDay(weekMarkets, scheduleMap);

  const vendorWhen: Record<string, string> = {};
  for (const pick of stallWeek) {
    const first = pick.where[0];
    if (first) vendorWhen[pick.vendorSlug] = `${first.when} · ${first.marketName}`;
  }

  const marketById = new Map(markets.map((market) => [market.id, market]));
  const posts = desk.posts.map((post) => {
    const market = marketById.get(post.market_id);
    return {
      ...post,
      markets: market ? { name: market.name, slug: market.slug } : null,
    };
  });
  const savedMarket = markets.find((market) => saves.markets.includes(market.slug));

  return (
    <AccountDesk
      profile={profile}
      email={desk.email}
      markets={markets}
      vendors={vendors}
      nextHours={nextHours}
      vendorWhen={vendorWhen}
      week={week}
      sellingToday={sellingToday}
      stallWeek={stallWeek}
      geoMarkets={markets.map(toGeoMarket)}
      stalls={stalls}
      initialMarketId={savedMarket?.id}
      posts={posts}
      claims={desk.claims}
      saves={saves}
      reviewCount={desk.reviewCount}
      visitPlanEmailedAt={desk.visitPlanEmailedAt}
    />
  );
}
