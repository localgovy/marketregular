import type { Metadata } from "next";
import { CLAIM_INBOX, SITE_NAME, SITE_URL, SITE_LOGO, SITE_OG, WEEKDAYS } from "@/lib/constants";
import { LAUNCH_CITY, LAUNCH_REGION_NAME, LAUNCH_TZ } from "@/lib/launch";
import { listingScore } from "@/lib/listing-score";
import { externalHref } from "@/lib/format";
import type { Market, MarketSchedule, MenuItem, Vendor } from "@/types/database";

export const SITE_DESCRIPTION =
  "Toronto farmers' markets and the stalls that work them: what's open today, this week's hours, addresses, maps, menus and reviews across the GTA.";

const FOOD_TAGS = new Set(["prepared-food", "bakery", "coffee"]);

/**
 * Google review snippets only honor a short parent allowlist
 * (LocalBusiness, Organization, Product, …). They do not follow
 * schema.org inheritance, so GroceryStore or FoodEstablishment alone
 * is reported as `Invalid object type for field "<parent_node>"`.
 */
function asLocalBusiness(...specific: string[]) {
  const extra = specific.filter((type) => type !== "LocalBusiness");
  return extra.length ? ["LocalBusiness", ...extra] : "LocalBusiness";
}

export const noIndex: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false },
};

/** Out of the index, still crawled, so internal links keep pointing at the halls. */
export const noIndexFollow: Metadata["robots"] = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
};

export function absoluteUrl(path = "/") {
  const base = SITE_URL.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMeta({
  title,
  description,
  path,
  index = true,
  follow = false,
}: {
  title?: string;
  description: string;
  path: string;
  index?: boolean;
  /** Keep crawling a page that is out of the index. */
  follow?: boolean;
}): Metadata {
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    robots: index ? { index: true, follow: true } : follow ? noIndexFollow : noIndex,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}${SITE_LOGO}`,
        },
        areaServed: { "@type": "AdministrativeArea", name: LAUNCH_REGION_NAME },
        contactPoint: {
          "@type": "ContactPoint",
          email: CLAIM_INBOX,
          contactType: "customer support",
          url: `${SITE_URL}/contact`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en-CA",
        publisher: { "@id": `${SITE_URL}/#org` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/markets?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

function clock(value: string) {
  return value.slice(0, 5);
}

function aggregateRatingJsonLd(row: {
  rating_avg?: number | string | null;
  review_count?: number | null;
}) {
  const score = listingScore(row.rating_avg, row.review_count);
  if (!score) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: Number(score.avg.toFixed(2)),
    bestRating: 5,
    worstRating: 1,
    reviewCount: score.count,
  };
}

function sameAsLinks(...urls: Array<string | null | undefined>) {
  const list = urls.map((url) => externalHref(url)).filter((url): url is string => Boolean(url));
  if (!list.length) return undefined;
  return list.length === 1 ? list[0] : list;
}

const MONTH_DAY = /^\d{2}-\d{2}$/;

/** `MM-DD` season bounds become this year's window; a wrap-around ends next year. */
function seasonWindow(start: string | null, end: string | null, now = new Date()) {
  if (!start || !end || !MONTH_DAY.test(start) || !MONTH_DAY.test(end)) return {};
  const year = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: LAUNCH_TZ, year: "numeric" }).format(now),
  );
  const endYear = start <= end ? year : year + 1;
  return { validFrom: `${year}-${start}`, validThrough: `${endYear}-${end}` };
}

function postalAddress(market: Pick<Market, "address" | "city" | "province" | "postal_code">) {
  return {
    "@type": "PostalAddress",
    streetAddress: market.address,
    addressLocality: market.city,
    addressRegion: market.province,
    ...(market.postal_code ? { postalCode: market.postal_code } : {}),
    addressCountry: "CA",
  };
}

function mapUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function listingImage(logoUrl: string | null) {
  return externalHref(logoUrl) ?? absoluteUrl(SITE_OG);
}

export function marketJsonLd(
  market: Market & { schedules: MarketSchedule[] },
  now = new Date(),
) {
  const aggregateRating = aggregateRatingJsonLd(market);
  const url = absoluteUrl(`/markets/${market.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": asLocalBusiness("GroceryStore"),
    "@id": `${url}#market`,
    name: market.name,
    description: market.about ?? undefined,
    url,
    image: listingImage(market.logo_url),
    telephone: market.phone ?? undefined,
    sameAs: sameAsLinks(market.website, market.instagram, market.tiktok, market.facebook),
    address: postalAddress(market),
    geo: {
      "@type": "GeoCoordinates",
      latitude: market.lat,
      longitude: market.lng,
    },
    hasMap: mapUrl(market.lat, market.lng),
    areaServed: { "@type": "AdministrativeArea", name: LAUNCH_REGION_NAME },
    openingHoursSpecification: market.schedules.map((row) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: WEEKDAYS[row.weekday] ?? "Sunday",
      opens: clock(row.opens_at),
      closes: clock(row.closes_at),
      ...seasonWindow(row.season_start, row.season_end, now),
    })),
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

type VendorHallForJsonLd = Pick<
  Market,
  "slug" | "name" | "address" | "city" | "province" | "postal_code" | "lat" | "lng"
>;

function hallPlace(hall: VendorHallForJsonLd) {
  return {
    "@type": "Place" as const,
    name: hall.name,
    url: absoluteUrl(`/markets/${hall.slug}`),
    address: postalAddress(hall),
    geo: {
      "@type": "GeoCoordinates",
      latitude: hall.lat,
      longitude: hall.lng,
    },
  };
}

function stallMenu(url: string, menus: MenuItem[]) {
  if (!menus.length) return undefined;
  return {
    "@type": "Menu",
    "@id": `${url}#menu`,
    hasMenuItem: menus.slice(0, 40).map((item) => ({
      "@type": "MenuItem",
      name: item.name,
      ...(item.description ? { description: item.description } : {}),
      ...(item.price_cents != null
        ? {
            offers: {
              "@type": "Offer",
              price: (item.price_cents / 100).toFixed(2),
              priceCurrency: "CAD",
            },
          }
        : {}),
    })),
  };
}

export function vendorJsonLd(
  vendor: Vendor & { menus?: MenuItem[]; markets?: VendorHallForJsonLd[] },
) {
  const aggregateRating = aggregateRatingJsonLd(vendor);
  const url = absoluteUrl(`/vendors/${vendor.slug}`);
  const halls = vendor.markets ?? [];
  const menus = vendor.menus ?? [];
  const servesFood = vendor.tags.some((tag) => FOOD_TAGS.has(tag));
  const menu = servesFood ? stallMenu(url, menus) : undefined;

  return {
    "@context": "https://schema.org",
    "@type": servesFood ? asLocalBusiness("FoodEstablishment") : "LocalBusiness",
    "@id": `${url}#stall`,
    name: vendor.name,
    description: vendor.about ?? undefined,
    url,
    image: listingImage(vendor.logo_url),
    telephone: vendor.phone ?? undefined,
    sameAs: sameAsLinks(vendor.website, vendor.instagram, vendor.tiktok, vendor.facebook),
    areaServed: { "@type": "AdministrativeArea", name: LAUNCH_REGION_NAME },
    ...(halls.length === 1 ? { containedInPlace: hallPlace(halls[0]) } : {}),
    ...(menu ? { hasMenu: menu } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/**
 * Ordered directory results. Keeps the list machine-readable without repeating each
 * listing's own markup, which lives on the listing page.
 */
export function itemListJsonLd({
  name,
  path,
  items,
}: {
  name: string;
  path: string;
  items: Array<{ name: string; path: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(path),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export const MARKETS_CRUMB = { name: `${LAUNCH_CITY} farmers' markets`, path: "/markets" };
