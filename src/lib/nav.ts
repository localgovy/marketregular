export const SITE_NAV = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/markets", label: "Markets" },
  { href: "/products", label: "Products" },
  { href: "/blog", label: "Blog" },
  { href: "/saved", label: "Saved" },
] as const;

/** Footer only until the live list has posts. */
export const SITE_FEED_NAV = { href: "/feed", label: "Feed" } as const;

/** Header text link beside the account chip. Same destination as the contact claim form. Hidden until the header row can hold the search and this label; the footer shows Contact below that. */
export const SITE_CLAIM_NAV = {
  href: "/contact",
  label: "For Market and Vendor Operators",
} as const;

export const SITE_META_NAV = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
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

export function isAuthChromePath(path: string) {
  return (
    path === "/login" ||
    path === "/signup" ||
    path === "/onboarding" ||
    path.startsWith("/auth/")
  );
}
