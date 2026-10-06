import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";
import { listMarkets, listVendors } from "@/lib/data/catalog";
import { isSeasonAlias } from "@/lib/listing-siblings";

type AdminClient = NonNullable<Awaited<ReturnType<typeof requireAdmin>>["supabase"]>;

async function countLivePosts(supabase: AdminClient, marketIds: string[]) {
  if (!marketIds.length) return 0;
  let total = 0;
  for (let index = 0; index < marketIds.length; index += 80) {
    const { count, error } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("flagged", false)
      .in("market_id", marketIds.slice(index, index + 80));
    if (error || count == null) return null;
    total += count;
  }
  return total;
}

async function directoryCounts(supabase: AdminClient) {
  const [marketsResult, vendorsResult] = await Promise.all([
    listMarkets()
      .then((rows) => ({ rows, failed: false as const }))
      .catch(() => ({ rows: null, failed: true as const })),
    listVendors()
      .then((rows) => rows.length)
      .catch(() => null),
  ]);

  if (marketsResult.failed || !marketsResult.rows) {
    return { markets: null, vendors: vendorsResult, posts: null };
  }

  const markets = marketsResult.rows.filter((market) => !isSeasonAlias(market.slug));
  const posts = await countLivePosts(
    supabase,
    markets.map((market) => market.id),
  );
  return { markets: markets.length, vendors: vendorsResult, posts };
}

export default async function AdminHomePage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;

  const [directory, applications, claims] = await Promise.all([
    directoryCounts(supabase),
    supabase.from("portal_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const openApplications =
    applications.error || claims.error || applications.count == null || claims.count == null
      ? null
      : applications.count + claims.count;

  const stats = [
    { label: "Published markets", value: directory.markets },
    { label: "Published vendors", value: directory.vendors },
    { label: "Live posts", value: directory.posts },
    { label: "Open applications", value: openApplications },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <li key={stat.label} className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="type-kicker text-muted-foreground">{stat.label}</p>
          {stat.value == null ? (
            <p className="mt-1 text-base text-muted-foreground">Could not load</p>
          ) : (
            <p className="type-page">{stat.value}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
