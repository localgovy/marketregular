import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { buttonVariants } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/constants";
import type { Market } from "@/types/database";

export default async function AdminMarketsPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from("markets").select("*").order("name");
  const markets = (data ?? []) as Market[];
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
              <p className="text-xs text-muted-foreground">
                {m.city}, {m.province} · {m.status}
              </p>
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
