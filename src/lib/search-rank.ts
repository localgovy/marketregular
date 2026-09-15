function foldName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** 0 exact, 1 prefix, 2 contains, 3 tag-only / no name hit. */
export function nameHitRank(name: string, q: string) {
  const n = foldName(name);
  const query = foldName(q).trim();
  if (!query) return 3;
  if (n === query) return 0;
  if (n.startsWith(query) || n.startsWith(`${query} `)) return 1;
  if (n.includes(query)) return 2;
  return 3;
}

/** Stable: keeps the previous sort inside each name-hit band. */
export function preferQueryNameHits<T extends { name: string }>(rows: T[], q: string) {
  const query = q.trim();
  if (!query) return rows;
  return [...rows].sort(
    (a, b) => nameHitRank(a.name, query) - nameHitRank(b.name, query),
  );
}

export function hallsHostingNameHits(
  links: Array<{ market_id: string; vendor_id: string }>,
  vendors: Array<{ id: string; name: string }>,
  q: string,
) {
  const hitIds = new Set(
    vendors.filter((vendor) => nameHitRank(vendor.name, q) < 3).map((vendor) => vendor.id),
  );
  const halls = new Set<string>();
  for (const link of links) {
    if (hitIds.has(link.vendor_id)) halls.add(link.market_id);
  }
  return halls;
}
