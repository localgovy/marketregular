export type LiveListingRedirect = { source: string; destination: string };

type LiveAlias = { kind?: string; from_slug?: string; to_slug?: string };

/** Rows from `listing_slug_aliases`. Empty when Supabase is unset or the read fails. */
export async function fetchLiveListingRedirects(): Promise<LiveListingRedirect[]> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(
    /\/$/,
    "",
  );
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/listing_slug_aliases?select=kind,from_slug,to_slug`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    const rows: LiveListingRedirect[] = [];
    for (const row of data as LiveAlias[]) {
      if (row.kind !== "vendor" && row.kind !== "market") continue;
      if (!row.from_slug || !row.to_slug || row.from_slug === row.to_slug) continue;
      const prefix = row.kind === "vendor" ? "/vendors" : "/markets";
      rows.push({
        source: `${prefix}/${row.from_slug}`,
        destination: `${prefix}/${row.to_slug}`,
      });
    }
    rows.sort((a, b) => a.source.localeCompare(b.source));
    return rows;
  } catch {
    return [];
  }
}
