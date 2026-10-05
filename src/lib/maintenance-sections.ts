export type MaintenanceKind = "vendor" | "market";

export type MaintenanceSection = {
  key: string;
  label: string;
  kinds: readonly MaintenanceKind[];
};

/** Stable keys. Labels are the words an owner and admin both see. */
export const MAINTENANCE_SECTIONS: readonly MaintenanceSection[] = [
  { key: "about", label: "About", kinds: ["vendor", "market"] },
  { key: "logo", label: "Logo", kinds: ["vendor", "market"] },
  { key: "contact", label: "Phone and email", kinds: ["vendor", "market"] },
  { key: "links", label: "Website and socials", kinds: ["vendor", "market"] },
  { key: "tags", label: "Tags", kinds: ["vendor", "market"] },
  { key: "menu", label: "Menu", kinds: ["vendor"] },
  { key: "halls", label: "Markets", kinds: ["vendor"] },
  { key: "place", label: "Place", kinds: ["market"] },
  { key: "hours", label: "Hours", kinds: ["market"] },
  { key: "roster", label: "Stalls", kinds: ["market"] },
];

export type VendorMaintenanceFields = {
  about: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  tags: string[];
};

export type MarketMaintenanceFields = VendorMaintenanceFields & {
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
};

export type MaintenanceListing = {
  id: string;
  name: string;
  maintenance_opt_outs: readonly string[];
};

const SECTION_KEYS = new Set(MAINTENANCE_SECTIONS.map((section) => section.key));

export function sectionsFor(kind: MaintenanceKind) {
  return MAINTENANCE_SECTIONS.filter((section) => section.kinds.includes(kind));
}

/** Drop unknown keys and repeats. A stored list can be shown even if a key was retired. */
export function readOptOuts(kind: MaintenanceKind, value: unknown) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(sectionsFor(kind).map((section) => section.key));
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed.has(item) || out.includes(item)) continue;
    out.push(item);
  }
  return out;
}

function sameOptOuts(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const keys = new Set(right);
  return left.every((key) => keys.has(key));
}

/**
 * Write the submitted opt-outs when the form still matches the row.
 * A stale form keeps the row, unless the desk checked the override.
 * Changing checkboxes on a stale form asks for a reload.
 * `loaded` null means the form did not remember what it showed.
 */
export function nextMaintenanceOptOuts(input: {
  current: readonly string[];
  loaded: readonly string[] | null;
  submitted: readonly string[];
  override: boolean;
}): { write: readonly string[] } | { keep: true } | { reload: true } {
  if (input.loaded == null) {
    return input.override ? { write: input.submitted } : { keep: true };
  }
  if (sameOptOuts(input.current, input.loaded)) return { write: input.submitted };
  if (input.override) return { write: input.submitted };
  if (!sameOptOuts(input.submitted, input.loaded)) return { reload: true };
  return { keep: true };
}

/** Reject a key this listing cannot opt out of, and a repeated key. Empty is allowed. */
export function optOutsFromForm(kind: MaintenanceKind, values: readonly string[]): string[] | "bad" {
  const allowed = new Set(sectionsFor(kind).map((section) => section.key));
  const out: string[] = [];
  for (const value of values) {
    if (!SECTION_KEYS.has(value) || !allowed.has(value) || out.includes(value)) return "bad";
    out.push(value);
  }
  return out;
}

function sameText(current: string | null, next: string | null) {
  return (current ?? "") === (next ?? "");
}

function sameTags(current: readonly string[], next: readonly string[]) {
  return current.length === next.length && current.every((tag, index) => tag === next[index]);
}

function sameCoord(current: number | null, next: number | null) {
  if (current == null || next == null) return current == null && next == null;
  return current === next;
}

function sharedTouches(current: VendorMaintenanceFields, next: VendorMaintenanceFields) {
  const touched: string[] = [];
  if (!sameText(current.about, next.about)) touched.push("about");
  if (!sameText(current.logo_url, next.logo_url)) touched.push("logo");
  if (!sameText(current.phone, next.phone) || !sameText(current.email, next.email)) touched.push("contact");
  if (
    !sameText(current.website, next.website) ||
    !sameText(current.instagram, next.instagram) ||
    !sameText(current.tiktok, next.tiktok) ||
    !sameText(current.facebook, next.facebook)
  ) {
    touched.push("links");
  }
  if (!sameTags(current.tags, next.tags)) touched.push("tags");
  return touched;
}

export function touchedVendorSections(current: VendorMaintenanceFields, next: VendorMaintenanceFields) {
  return sharedTouches(current, next);
}

export function touchedMarketSections(current: MarketMaintenanceFields, next: MarketMaintenanceFields) {
  const touched = sharedTouches(current, next);
  if (
    !sameText(current.address, next.address) ||
    !sameText(current.city, next.city) ||
    !sameText(current.province, next.province) ||
    !sameText(current.postal_code, next.postal_code) ||
    !sameCoord(current.lat, next.lat) ||
    !sameCoord(current.lng, next.lng)
  ) {
    touched.push("place");
  }
  return touched;
}

export function labelsFor(kind: MaintenanceKind, keys: readonly string[]) {
  const wanted = new Set(keys);
  return sectionsFor(kind)
    .filter((section) => wanted.has(section.key))
    .map((section) => section.label);
}

function joinLabels(labels: readonly string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function staysSentence(labels: readonly string[], noun: "stall" | "market") {
  const stay = labels.length === 1 ? "stays" : "stay";
  return `${joinLabels(labels)} ${stay} with this ${noun}`;
}

export function maintenanceBlockMessage(groups: { labels: readonly string[]; noun: "stall" | "market" }[]) {
  const sentences = groups
    .filter((group) => group.labels.length > 0)
    .map((group) => staysSentence(group.labels, group.noun));
  if (!sentences.length) return null;
  const count = groups.reduce((sum, group) => sum + group.labels.length, 0);
  const them = count === 1 ? "it" : "them";
  return `${sentences.join(". ")}. Check Save these sections anyway to change ${them}.`;
}

export function groupMaintenanceOptOuts(vendors: readonly MaintenanceListing[], markets: readonly MaintenanceListing[]) {
  const byName = (a: MaintenanceListing, b: MaintenanceListing) => a.name.localeCompare(b.name, "en");
  return MAINTENANCE_SECTIONS.map((section) => ({
    key: section.key,
    label: section.label,
    vendors: section.kinds.includes("vendor")
      ? vendors.filter((row) => row.maintenance_opt_outs.includes(section.key)).sort(byName)
      : [],
    markets: section.kinds.includes("market")
      ? markets.filter((row) => row.maintenance_opt_outs.includes(section.key)).sort(byName)
      : [],
  }));
}
