export const SITE_NAV = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/markets", label: "Markets" },
  { href: "/products", label: "Products" },
  { href: "/blog", label: "Blog" },
  { href: "/saved", label: "Saved" },
] as const;

/** Desktop header only. The mobile tab strip stays on SITE_NAV. */
export const PORTAL_NAV_LABEL = "Market/Vendor Portal";

export const SITE_PORTAL_NAV = [
  { href: "/market", label: "Market Portal" },
  { href: "/vendor", label: "Vendor Portal" },
] as const;

/** Footer only until the live list has posts. */
export const SITE_FEED_NAV = { href: "/feed", label: "Feed" } as const;

export const SITE_META_NAV = [
  { href: "/about", label: "About" },
  { href: "/vendor", label: "Vendor portal" },
  { href: "/market", label: "Market portal" },
] as const;

export const SITE_FOOTER_NAV = [
  ...SITE_NAV,
  SITE_FEED_NAV,
  ...SITE_META_NAV,
] as const;

/** Footer only. Not in the header. */
export const SITE_LEGAL_NAV = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;
