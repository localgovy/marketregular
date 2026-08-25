import Link from "next/link";
import { AccountCensus } from "@/components/account-census";
import { AccountHandleForm } from "@/components/account-handle-form";
import { AccountNameForm } from "@/components/account-name-form";
import { DeleteOwnPostForm } from "@/components/delete-own-post-form";
import { SignOutForm } from "@/components/sign-out-form";
import { AccountSavedLists } from "@/components/account-saved";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { EmailVisitButton } from "@/components/email-visit-button";
import { HomePanel } from "@/components/home-panel";
import { VendorTodayItem, VendorWeekItem } from "@/components/home-vendors-item";
import { ListingComposer } from "@/components/listing-composer";
import { ReviewScore } from "@/components/listing-score";
import {
  AsteriskMark,
  BangMark,
  CrateMark,
  PlateMark,
  SignMark,
  TallyMark,
  TagMark,
  TicketMark,
} from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { TorontoWeek } from "@/components/toronto-week";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import { decodeFloorBody } from "@/lib/floor-note";
import { tagLabel } from "@/lib/find-paths";
import type { GeoMarket } from "@/lib/geo";
import type { UpcomingGroup } from "@/lib/upcoming";
import type { VendorTodayRow, VendorWeekPick } from "@/lib/vendor-week";
import type { ClaimRequest, Market, Profile, StallRef, Vendor } from "@/types/database";
import type { AccountPost } from "@/lib/data/account";

function marketFromPost(markets: AccountPost["markets"]) {
  if (
    markets &&
    typeof markets === "object" &&
    "slug" in markets &&
    "name" in markets &&
    typeof markets.slug === "string" &&
    typeof markets.name === "string"
  ) {
    return markets;
  }
  return null;
}

function claimStatus(status: ClaimRequest["status"]) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Turned down";
  return "Waiting";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "R";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

export function AccountDesk({
  profile,
  email,
  markets,
  vendors,
  nextHours,
  vendorWhen,
  week,
  sellingToday,
  stallWeek,
  geoMarkets,
  stalls,
  initialMarketId,
  posts,
  claims,
  saves,
  reviewCount,
  visitPlanEmailedAt,
}: {
  profile: Profile;
  email: string | null;
  markets: Market[];
  vendors: Vendor[];
  nextHours: Record<string, string>;
  vendorWhen: Record<string, string>;
  week: UpcomingGroup[];
  sellingToday: VendorTodayRow[];
  stallWeek: VendorWeekPick[];
  geoMarkets: GeoMarket[];
  stalls: Array<Pick<StallRef, "id" | "name" | "slug" | "market_id" | "stall">>;
  initialMarketId?: string;
  posts: AccountPost[];
  claims: ClaimRequest[];
  saves: { markets: string[]; vendors: string[] };
  reviewCount: number;
  visitPlanEmailedAt?: string | null;
}) {
  const name = profile.display_name?.trim() || "Regular";
  const handle = profile.username ? `@${profile.username}` : null;
  const visitSlugs =
    saves.markets.length > 0
      ? saves.markets.slice(0, 3)
      : (profile.favorite_market_slugs ?? []).slice(0, 3);
  const vendorBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor]));
  const listingName = new Map<string, { name: string; href: string }>();
  for (const market of markets) {
    listingName.set(`market:${market.id}`, {
      name: market.name,
      href: `/markets/${market.slug}`,
    });
  }
  for (const vendor of vendors) {
    listingName.set(`vendor:${vendor.id}`, {
      name: vendor.name,
      href: `/vendors/${vendor.slug}`,
    });
  }

  return (
    <div>
      <AccountCensus initialSaves={saves} reviewCount={reviewCount} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start lg:gap-5 lg:px-6">
        <div className="grid min-w-0 gap-5">
          <header className="max-w-2xl">
            <p className="type-kicker text-muted-foreground">Your profile</p>
            <h1>{name}</h1>
            <p className="type-lede mt-2 text-muted-foreground">
              Your {SITE_NAME} identity – post reviews, save markets, and purchase your
              favourite goods ahead of time, all in one profile.
            </p>
          </header>

          <TorontoWeek
            id="week"
            groups={week}
            kicker="From your saved list"
            title="This week"
            how="Your saved markets' schedules throughout the week, click on a name for more info."
            empty="Save a market or a stall and this week's hours show up here."
            action={
              <Link href="/markets" className="hover:underline">
                Full Markets List
              </Link>
            }
          />

          {sellingToday.length ? (
            <HomePanel
              id="stalls-today"
              tone="vendors"
              icon={CrateMark}
              kicker="From your stalls"
              title="Selling today"
              how={
                <>
                  Saved stalls on today&apos;s calendar.
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <NowLabel>Selling now</NowLabel>
                    <span>At the stall this minute.</span>
                  </span>
                </>
              }
            >
              <ul className="ring-1 ring-border">
                {sellingToday.map((row) => (
                  <VendorTodayItem key={`${row.vendorSlug}-${row.marketSlug}`} row={row} />
                ))}
              </ul>
            </HomePanel>
          ) : null}

          <HomePanel
            id="saved"
            tone="here"
            icon={TicketMark}
            kicker="On this account"
            title="Saved"
            how="Your saves. Find your favourites."
            action={
              <Link href="/saved" className="hover:underline">
                Full Saved List
              </Link>
            }
          >
            <AccountSavedLists
              markets={markets}
              vendors={vendors}
              nextHours={nextHours}
              vendorWhen={vendorWhen}
              initialSaves={saves}
            />
            {visitSlugs.length ? (
              <EmailVisitButton
                className="mt-4"
                slugs={visitSlugs}
                lastSentAt={visitPlanEmailedAt}
              />
            ) : null}
          </HomePanel>

          <HomePanel
            id="note"
            tone="vendors"
            icon={TagMark}
            kicker="On the live list"
            title="Leave a review"
            how="Give others a taste of what you experienced at a market or stall. Rate out of 5 and tag the market or vendor. Tell us how it really was."
          >
            <ListingComposer
              signedIn
              markets={geoMarkets}
              stalls={stalls}
              initialMarketId={initialMarketId}
              className="rounded-md ring-1 ring-border"
            />
          </HomePanel>

          <HomePanel
            id="reviews"
            tone="menus"
            icon={AsteriskMark}
            kicker="Under your name"
            title="Your reviews"
            how="These show on the market or stall. Delete one if you change your mind."
            action={
              <Link href="#note" className="hover:underline">
                Write one
              </Link>
            }
          >
            {posts.length ? (
              <ul className="ring-1 ring-border">
                {posts.map((post) => {
                  const decoded = decodeFloorBody(post.body);
                  const market = marketFromPost(post.markets);
                  const vendor = decoded.vendorSlug
                    ? vendorBySlug.get(decoded.vendorSlug)
                    : undefined;
                  return (
                    <li
                      key={post.id}
                      className="grid gap-2 border-b border-border px-3 py-3 last:border-b-0"
                    >
                      <p className="flex flex-wrap items-baseline gap-x-1 text-sm leading-snug text-muted-foreground">
                        {vendor ? (
                          <Link
                            href={`/vendors/${vendor.slug}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {vendor.name}
                          </Link>
                        ) : null}
                        {vendor && market ? <span aria-hidden>·</span> : null}
                        {market ? (
                          <Link href={`/markets/${market.slug}`} className="hover:underline">
                            {market.name}
                          </Link>
                        ) : null}
                        {decoded.rating ? (
                          <>
                            <span aria-hidden>·</span>
                            <ReviewScore value={decoded.rating} />
                          </>
                        ) : null}
                        <span aria-hidden>·</span>
                        <time className="type-nums" dateTime={post.created_at}>
                          {timeAgo(post.created_at)}
                        </time>
                      </p>
                      <p className="text-base leading-snug">{decoded.body}</p>
                      {decoded.tags.length ? (
                        <p className="text-sm">
                          {decoded.tags.map((tag, index) => (
                            <span key={tag}>
                              {index > 0 ? " " : null}
                              <Link
                                href={`/feed?tag=${encodeURIComponent(tag)}`}
                                className="text-primary hover:underline"
                              >
                                {tagLabel(tag)}
                              </Link>
                            </span>
                          ))}
                        </p>
                      ) : null}
                      <DeleteOwnPostForm id={post.id} />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-base text-muted-foreground">
                Nothing written yet.{" "}
                <Link href="#note" className="font-medium text-primary hover:underline">
                  Tell the next shopper
                </Link>{" "}
                what was on the tables.
              </p>
            )}
          </HomePanel>
        </div>

        <aside className="mt-8 grid gap-5 lg:mt-0">
          <HomePanel
            id="plate"
            tone="find"
            icon={PlateMark}
            kicker="On posts"
            title="Name and sign-in"
            how="Your handle is your unique name, but your 'Name on posts' is what people actually see."
          >
            <div className="flex items-center gap-3 pb-4">
              {profile.avatar_url && !/\.svg([?#]|$)/i.test(profile.avatar_url) ? (
                // Google (and similar) profile photos are off our image host list.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="stall-chip-sm size-10 object-cover"
                />
              ) : (
                <span className="stall-chip-sm flex size-10 shrink-0 items-center justify-center bg-primary-foreground/15 font-medium text-primary-foreground">
                  {initials(name)}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-base font-medium text-primary-foreground">{name}</p>
                {handle ? (
                  <p className="text-sm text-chalk">{handle}</p>
                ) : null}
                {email ? (
                  <p className="break-all text-sm text-chalk">{email}</p>
                ) : null}
              </div>
            </div>
            <AccountNameForm displayName={profile.display_name ?? ""} />
            <div className="mt-4">
              <AccountHandleForm username={profile.username} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/account/password"
                className="text-sm font-medium text-primary-foreground underline underline-offset-4"
              >
                Password
              </Link>
              {profile.role === "admin" ? (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-primary-foreground underline underline-offset-4"
                >
                  Desk
                </Link>
              ) : null}
            </div>
            <SignOutForm className="mt-4">
              <Button
                type="submit"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                Sign out
              </Button>
            </SignOutForm>
          </HomePanel>

          {stallWeek.length ? (
            <HomePanel
              id="stalls-week"
              place="rail"
              tone="menus"
              icon={TallyMark}
              kicker="This week's stalls"
              title="Your stalls this week"
              how="Where the stalls you saved are on the calendar."
            >
              <ul className="ring-1 ring-border">
                {stallWeek.map((pick) => (
                  <VendorWeekItem key={pick.vendorSlug} pick={pick} />
                ))}
              </ul>
            </HomePanel>
          ) : null}

          {claims.length ? (
            <HomePanel
              id="claims"
              tone="back"
              icon={SignMark}
              kicker="Listings"
              title="Claims"
              how="Requests to run a market or stall page."
            >
              <ul className="ring-1 ring-border">
                {claims.map((claim) => {
                  const listing = listingName.get(`${claim.target_type}:${claim.target_id}`);
                  return (
                    <li
                      key={claim.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border px-3 py-2.5 last:border-b-0"
                    >
                      {listing ? (
                        <Link href={listing.href} className="min-w-0 font-medium hover:underline">
                          {listing.name}
                        </Link>
                      ) : (
                        <span className="min-w-0 font-medium">Listing</span>
                      )}
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {claimStatus(claim.status)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </HomePanel>
          ) : null}

          <HomePanel
            id="delete"
            tone="back"
            icon={BangMark}
            kicker="Leave"
            title="Delete account"
            how="Removes your sign-in, saved list, reviews, and claim requests. It cannot be undone."
          >
            <DeleteAccountForm />
          </HomePanel>
        </aside>
      </div>
    </div>
  );
}
