import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { MarketDayList } from "@/components/market-day-list";
import { ListingScore } from "@/components/listing-score";
import { listMarkets, listSchedules, listStalls, listVendors } from "@/lib/data/catalog";
import {
  CATEGORIES,
  categoryBySlug,
  marketsWithTag,
  scheduleMapFrom,
  vendorsWithTag,
} from "@/lib/landing";
import { LAUNCH_CITY } from "@/lib/launch";
import { nextOpenLabel } from "@/lib/schedule";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";
import { tagLabel } from "@/lib/tag-label";
import type { Market, MarketSchedule, Vendor } from "@/types/database";

export const revalidate = 3600;

/** Only stalls a shopper can actually visit get a card here. */
const STALL_CAP = 48;

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ tag: category.tag }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const category = categoryBySlug(tag);
  if (!category) return { title: "Markets" };
  const [markets, vendors, stalls] = await Promise.all([
    listMarkets(),
    listVendors(),
    listStalls(),
  ]);
  const halls = marketsWithTag({
    tag,
    markets,
    vendors,
    stalls,
    scope: category.scope,
  });
  const shops = category.scope === "markets" ? [] : vendorsWithTag(vendors, tag);
  const counted = shops.length
    ? `${halls.length} ${halls.length === 1 ? "market" : "markets"} and ${shops.length} ${shops.length === 1 ? "stall" : "stalls"}`
    : `${halls.length} ${halls.length === 1 ? "market" : "markets"}`;

  return pageMeta({
    title: category.title,
    description: `${counted} across ${LAUNCH_CITY} and the GTA. ${category.lede}`,
    path: `/markets/tag/${tag}`,
  });
}

function MarketList({
  markets,
  scheduleMap,
}: {
  markets: Market[];
  scheduleMap: Map<string, MarketSchedule[]>;
}) {
  return (
    <MarketDayList
      scheduleMap={scheduleMap}
      rows={markets.map((market) => {
        const schedules = scheduleMap.get(market.id) ?? [];
        return {
          market,
          hours: nextOpenLabel(schedules, market.province),
          opensMinutes: 0,
          notes: null,
          openNow: false,
          stallCount: 0,
        };
      })}
    />
  );
}

function StallList({ vendors }: { vendors: Vendor[] }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {vendors.map((vendor) => (
        <li key={vendor.id} className="rounded-md bg-card p-3 ring-1 ring-border">
          <Link
            href={`/vendors/${vendor.slug}`}
            className="text-base font-medium hover:underline"
          >
            {vendor.name}
          </Link>
          <ListingScore
            ratingAvg={vendor.rating_avg}
            reviewCount={vendor.review_count}
            compact
            className="ml-2 align-middle"
          />
          {vendor.about ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{vendor.about}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default async function MarketTagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const category = categoryBySlug(tag);
  if (!category) notFound();

  const [markets, vendors, stalls, schedules] = await Promise.all([
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
  ]);
  const scheduleMap = scheduleMapFrom(schedules);
  const halls = marketsWithTag({
    tag,
    markets,
    vendors,
    stalls,
    scope: category.scope,
  });
  const shops = category.scope === "markets" ? [] : vendorsWithTag(vendors, tag);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          MARKETS_CRUMB,
          { name: tagLabel(tag), path: `/markets/tag/${tag}` },
        ])}
      />
      <JsonLd
        data={itemListJsonLd({
          name: category.heading,
          path: `/markets/tag/${tag}`,
          items: halls.map((market) => ({
            name: market.name,
            path: `/markets/${market.slug}`,
          })),
        })}
      />
      <BackButton href="/markets" />
      <h1>{category.heading}</h1>
      <p className="type-lede mt-2 max-w-2xl text-muted-foreground">{category.lede}</p>

      <section className="mt-8">
        <h2>
          {halls.length} {halls.length === 1 ? "market" : "markets"}
        </h2>
        {halls.length ? (
          <MarketList markets={halls} scheduleMap={scheduleMap} />
        ) : (
          <p className="mt-2 text-base text-muted-foreground">
            Nothing in the directory carries this yet.
          </p>
        )}
      </section>

      {shops.length ? (
        <section className="mt-10">
          <h2>
            {shops.length} {shops.length === 1 ? "stall" : "stalls"}
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            Sorted by review score. Open a stall to see which markets it works and when.
          </p>
          <StallList vendors={shops.slice(0, STALL_CAP)} />
          {shops.length > STALL_CAP ? (
            <p className="mt-3 text-base">
              <Link
                href={`/markets?tag=${encodeURIComponent(tag)}`}
                className="font-medium text-primary hover:underline"
              >
                Search all {shops.length} {tagLabel(tag).toLowerCase()} stalls
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      <BrowseLinks className="mt-10" exceptTag={tag} />
    </div>
  );
}
