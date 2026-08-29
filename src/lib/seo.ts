import type { Metadata } from "next";
import { CLAIM_INBOX, SITE_NAME, SITE_URL, SITE_LOGO, WEEKDAYS } from "@/lib/constants";
import { listingScore } from "@/lib/listing-score";
import { externalHref } from "@/lib/format";
import type { Market, MarketSchedule, Vendor } from "@/types/database";

export const SITE_DESCRIPTION =
  "Find farmers' markets across the Greater Toronto Area and their vendors: this week's hours, maps, menus, reviews, and a live floor feed.";

export const noIndex: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: { index: false, follow: false },
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
}: {
  title?: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    robots: index ? { index: true, follow: true } : noIndex,
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
        logo: `${SITE_URL}${SITE_LOGO}`,
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

export function marketJsonLd(market: Market & { schedules: MarketSchedule[] }) {
  const aggregateRating = aggregateRatingJsonLd(market);
  return {
    "@context": "https://schema.org",
    "@type": "FarmersMarket",
    name: market.name,
    description: market.about ?? undefined,
    url: absoluteUrl(`/markets/${market.slug}`),
    telephone: market.phone ?? undefined,
    sameAs: sameAsLinks(market.website, market.instagram, market.tiktok),
    address: {
      "@type": "PostalAddress",
      streetAddress: market.address,
      addressLocality: market.city,
      addressRegion: market.province,
      postalCode: market.postal_code ?? undefined,
      addressCountry: "CA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: market.lat,
      longitude: market.lng,
    },
    openingHoursSpecification: market.schedules.map((row) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: WEEKDAYS[row.weekday] ?? "Sunday",
      opens: clock(row.opens_at),
      closes: clock(row.closes_at),
    })),
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function vendorJsonLd(vendor: Vendor) {
  const aggregateRating = aggregateRatingJsonLd(vendor);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.name,
    description: vendor.about ?? undefined,
    url: absoluteUrl(`/vendors/${vendor.slug}`),
    telephone: vendor.phone ?? undefined,
    sameAs: sameAsLinks(vendor.website, vendor.instagram, vendor.tiktok),
    areaServed: { "@type": "AdministrativeArea", name: "Greater Toronto Area" },
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}
