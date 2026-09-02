import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

type MarketRow = { slug: string; city: string; status: string };

function firstRelation<T>(value: unknown): T | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" ? (row as T) : null;
}

/**
 * A listing that goes to draft used to be a public URL. Answering those with a
 * public URL. Answering those with a 404 leaves them in Search Console for
 * months, so send them somewhere useful instead. Anonymous reads are filtered
 * to published rows, so telling "retired" apart from "never existed" needs the
 * service role; without it the caller falls back to a genuine 404.
 */
export async function retiredMarketTarget(slug: string): Promise<string | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("markets")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data ? "/markets" : null;
}

/** Retired stalls go to a hall that still lists them, so the visitor lands on the food. */
export async function retiredVendorTarget(slug: string): Promise<string | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data: vendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!vendor) return null;

  const { data: halls } = await supabase
    .from("market_vendors")
    .select("markets(slug, city, status)")
    .eq("vendor_id", (vendor as { id: string }).id);

  for (const row of halls ?? []) {
    const market = firstRelation<MarketRow>((row as { markets?: unknown }).markets);
    if (!market || market.status !== "published") continue;
    return `/markets/${market.slug}`;
  }
  return "/markets";
}
