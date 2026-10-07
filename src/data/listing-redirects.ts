/**
 * Public 308s for renamed or retired listings. next.config.ts serves these at
 * the edge so unknown slugs never render (vendor/market pages set
 * `dynamicParams = false` and must not probe live drafts).
 *
 * In-place slug edits after `listing_slug_aliases` is applied are captured by
 * a database trigger and merged into next.config at build time. Merges that
 * delete a row still need a line here.
 */
export type ListingRedirect = {
  source: string;
  destination: string;
};

const RAW_LISTING_REDIRECTS: ListingRedirect[] = [
  { source: "/vendors/the-agrarian-kitchen-the-strong-earth-company", destination: "/vendors/agrarian-kitchen" },
  { source: "/vendors/thames-river-farms", destination: "/vendors/thames-river-melons" },
  { source: "/vendors/bitter-better-canda", destination: "/vendors/bitter-better" },
  { source: "/vendors/molly-b-s-gluten-free", destination: "/vendors/molly-b-s-gluten-free-kitchen" },
  { source: "/vendors/nemophillist-creations", destination: "/vendors/nemophilist-creations" },
  { source: "/vendors/bitter-better-canada", destination: "/vendors/bitter-better" },
  { source: "/vendors/cosmos-baking", destination: "/vendors/cosmos-baking-studio" },
  { source: "/vendors/don-grilled-tacos-brunch", destination: "/vendors/don-grilled-steak-tacos-and-brunch" },
  { source: "/vendors/first-fish-distribution", destination: "/vendors/first-fish" },
  { source: "/vendors/fish-tree-farms", destination: "/vendors/fish-tree-farm" },
  { source: "/vendors/gebeta-ethiopian-bbq", destination: "/vendors/gebeta" },
  { source: "/vendors/gebeta-toronto", destination: "/vendors/gebeta" },
  { source: "/vendors/goodlot-farm-brewing", destination: "/vendors/goodlot-farmstead-brewing-company" },
  { source: "/vendors/kindred-folk", destination: "/vendors/kindred-folk-flowers" },
  { source: "/vendors/kinsip", destination: "/vendors/kinsip-house-of-fine-spirits" },
  { source: "/vendors/link-haus-fine-sausage", destination: "/vendors/link-haus" },
  { source: "/vendors/many-roads-purveyors-of-eggs-meat-cheese", destination: "/vendors/many-roads-purveyors" },
  { source: "/vendors/meui-kimchi", destination: "/vendors/meui" },
  { source: "/vendors/nepali-momos", destination: "/vendors/nepali-momo" },
  { source: "/vendors/ostrich-land-the-power-of-ostrich", destination: "/vendors/ostrich-land" },
  { source: "/vendors/potager-dukanada", destination: "/vendors/potager-du-kanada" },
  { source: "/vendors/red-tape", destination: "/vendors/red-tape-brewery" },
  { source: "/vendors/sarah-nicole-artistry", destination: "/vendors/sarah-nicole-s-artistry" },
  { source: "/vendors/sun-ray-farms", destination: "/vendors/sun-ray-orchards" },
  { source: "/vendors/hooked-stouffville", destination: "/vendors/hooked" },
  { source: "/vendors/pv-s-fresh-fruits-veg", destination: "/vendors/pv-s-fresh-fruits-vegetables" },
  { source: "/vendors/bruem-design-media", destination: "/vendors/bruem-designs" },
  { source: "/vendors/the-east-olive-supply-co-choose-to-infuse", destination: "/vendors/the-east-olive-supply-company" },
  { source: "/vendors/thorganic-farm", destination: "/vendors/thorganic-farms" },
  { source: "/vendors/clement-s-poultry", destination: "/vendors/clement-poultry" },
  { source: "/markets/sickkids-market-indoor-winter", destination: "/markets/sickkids-market" },
  { source: "/markets/gould-street-tmu", destination: "/markets" },
  { source: "/markets/trinity-bellwoods-farmers-market", destination: "/markets" },
  { source: "/markets/yzd-farmers-market", destination: "/markets" },
  { source: "/markets/leslieville-farmers-market-east-end-food-hub", destination: "/markets/the-leslieville-farmers-market" },
];

/** Follow A→B→C to C so next.config and the proxy stay single-hop. */
export function flattenListingRedirects(rows: readonly ListingRedirect[]): ListingRedirect[] {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.source || row.source === row.destination) continue;
    map.set(row.source, row.destination);
  }
  for (const from of [...map.keys()]) {
    const seen = new Set([from]);
    let dest = map.get(from);
    while (dest && map.has(dest) && !seen.has(dest)) {
      seen.add(dest);
      dest = map.get(dest);
    }
    if (!dest || dest === from) {
      map.delete(from);
      continue;
    }
    map.set(from, dest);
  }
  return [...map.entries()].map(([source, destination]) => ({ source, destination }));
}

export const LISTING_REDIRECTS = flattenListingRedirects(RAW_LISTING_REDIRECTS);

const BY_SOURCE = new Map(LISTING_REDIRECTS.map((row) => [row.source, row.destination]));

export function listingRedirectDestination(pathname: string) {
  return BY_SOURCE.get(pathname) ?? null;
}

export function isListingRedirectSource(pathname: string) {
  return BY_SOURCE.has(pathname);
}

export function listingRedirectsForNextConfig() {
  return LISTING_REDIRECTS.map((row) => ({
    source: row.source,
    destination: row.destination,
    permanent: true as const,
  }));
}
