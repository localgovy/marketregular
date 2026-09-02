export const SITE_NAV = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/markets", label: "Find Markets" },
  { href: "/feed", label: "Feed" },
  { href: "/saved", label: "Saved" },
] as const;

/** Header text links beside the account chip. Same face as Contact. */
export const SITE_META_NAV = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const SITE_FOOTER_NAV = [
  ...SITE_NAV,
  ...SITE_META_NAV,
] as const;
