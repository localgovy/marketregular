import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, WEEKDAYS } from "@/lib/constants";
import type { Market, MarketSchedule, Vendor } from "@/types/database";

export const SITE_DESCRIPTION =
  "Find Toronto farmers' markets and their vendors: this week's hours, maps, menus, reviews, and a live floor feed.";

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
        logo: `${SITE_URL}/brand/market-regular-logo.png`,
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

export function marketJsonLd(market: Market & { schedules: MarketSchedule[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "FarmersMarket",
    name: market.name,
    description: market.about ?? undefined,
    url: absoluteUrl(`/markets/${market.slug}`),
    telephone: market.phone ?? undefined,
    sameAs: market.website ?? undefined,
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
  };
}

export function vendorJsonLd(vendor: Vendor) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.name,
    description: vendor.about ?? undefined,
    url: absoluteUrl(`/vendors/${vendor.slug}`),
    telephone: vendor.phone ?? undefined,
    sameAs: vendor.website ?? undefined,
    areaServed: { "@type": "City", name: "Toronto" },
  };
}
