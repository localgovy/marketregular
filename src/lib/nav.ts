import { siteCopy } from "@/content/site-copy";

const labels = siteCopy["every page"];

export const SITE_NAV = [
  { href: "/", label: labels.nav.home },
  { href: "/events", label: labels.nav.calendar },
  { href: "/markets", label: labels.nav.markets },
  { href: "/products", label: labels.nav.products },
  { href: "/blog", label: labels.nav.blog },
  { href: "/saved", label: labels.nav.saved },
] as const;

/** Beside Sign in in the header. The tab rows stay on SITE_NAV. */
export const PORTAL_NAV_LABEL = labels.portalButtonLabel;

export const SITE_PORTAL_NAV = [
  { href: "/market", label: labels.portalMenu.market },
  { href: "/vendor", label: labels.portalMenu.vendor },
] as const;

/** Footer only until the live list has posts. */
export const SITE_FEED_NAV = { href: "/feed", label: labels.nav.feed } as const;

export const SITE_META_NAV = [
  { href: "/about", label: labels.nav.about },
  { href: "/vendor", label: labels.nav.vendorPortal },
  { href: "/market", label: labels.nav.marketPortal },
] as const;

export const SITE_FOOTER_NAV = [
  ...SITE_NAV,
  SITE_FEED_NAV,
  ...SITE_META_NAV,
] as const;

/** Footer only. Not in the header. */
export const SITE_LEGAL_NAV = [
  { href: "/privacy", label: labels.nav.privacy },
  { href: "/terms", label: labels.nav.terms },
] as const;
