import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { ListingScore } from "@/components/listing-score";
import { buttonVariants } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/constants";
import { withListingStats } from "@/lib/listing-score";
import type { Market } from "@/types/database";

export default async function AdminMarketsPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("markets").select("*").order("name");
  const markets = ((data ?? []) as Market[]).map(withListingStats);
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Link href="/admin/markets/new" className={buttonVariants()}>
          New market
        </Link>
      </div>
      <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
        {markets.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-sm text-muted-foreground">
                {m.city}, {m.province} · {m.status}
              </p>
              <ListingScore
                className="mt-1"
                ratingAvg={m.rating_avg}
                reviewCount={m.review_count}
              />
            </div>
            <Link href={`/admin/markets/${m.id}`} className={buttonVariants({ variant: "outline" })}>
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
