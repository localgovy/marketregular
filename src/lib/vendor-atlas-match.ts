import { FIND_PAGES, findPageForProductSlug, type FindPage } from "@/data/find-pages";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Longest product name wins, so "sourdough bread" stays sourdough rather than the shorter bread page. */
export function matchFindPageByName(
  itemName: string,
  productSlug: string | null,
): FindPage | null {
  const bySlug = findPageForProductSlug(productSlug);
  if (bySlug && bySlug.vendors > 0) return bySlug;

  const lower = itemName.toLowerCase();
  let best: FindPage | null = null;
  let bestLength = 0;

  for (const page of FIND_PAGES) {
    if (page.vendors <= 0) continue;
    const phrases = [
      page.term.toLowerCase().replace(/^general\s+/, ""),
      ...page.matchSlugs.map((slug) => slug.replace(/-/g, " ").toLowerCase()),
    ];
    for (const phrase of phrases) {
      if (phrase.length < 3 || phrase.length <= bestLength) continue;
      const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
      if (!regex.test(lower)) continue;
      best = page;
      bestLength = phrase.length;
    }
  }

  return best;
}

export function stallCompareLabel(vendors: number, term: string) {
  const name = term.replace(/^General\s+/i, "").trim().toLowerCase();
  return `Compare ${vendors} stalls selling ${name}`;
}

export function orderedSectionNames(
  items: Array<{ name: string; order: number | null }>,
): string[] {
  const orders = new Map<string, number | null>();
  for (const item of items) {
    const current = orders.get(item.name);
    if (current === undefined) {
      orders.set(item.name, item.order);
      continue;
    }
    if (current == null && item.order != null) orders.set(item.name, item.order);
    else if (current != null && item.order != null && item.order < current) {
      orders.set(item.name, item.order);
    }
  }
  return [...orders.entries()]
    .sort((a, b) => compareSection(a[0], a[1], b[0], b[1]))
    .map(([name]) => name);
}

function compareSection(
  aName: string,
  aOrder: number | null,
  bName: string,
  bOrder: number | null,
) {
  if (aOrder == null && bOrder == null) return aName.localeCompare(bName);
  if (aOrder == null) return 1;
  if (bOrder == null) return -1;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return aName.localeCompare(bName);
}
