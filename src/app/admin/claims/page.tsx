import Link from "next/link";
import { decideClaim } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { fetchAllRows, requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";
import type { ClaimRequest } from "@/types/database";

export default async function ClaimsPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const claims = await fetchAllRows<ClaimRequest & { profiles?: { display_name: string | null } }>(
    (from, to) =>
      supabase
        .from("claim_requests")
        .select("*, profiles(display_name)")
        .order("created_at", { ascending: false })
        .range(from, to),
  );
  const vendorIds = [...new Set(claims.filter((claim) => claim.target_type === "vendor").map((claim) => claim.target_id))];
  const marketIds = [...new Set(claims.filter((claim) => claim.target_type === "market").map((claim) => claim.target_id))];
  const [vendors, markets] = await Promise.all([
    vendorIds.length
      ? supabase.from("vendors").select("id, name, slug").in("id", vendorIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    marketIds.length
      ? supabase.from("markets").select("id, name, slug").in("id", marketIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
  ]);
  const listingName = new Map<string, { name: string; href: string }>();
  for (const vendor of vendors.data ?? []) {
    listingName.set(`vendor:${vendor.id}`, { name: vendor.name, href: `/vendors/${vendor.slug}` });
  }
  for (const market of markets.data ?? []) {
    listingName.set(`market:${market.id}`, { name: market.name, href: `/markets/${market.slug}` });
  }

  return (
    <ul className="grid gap-4">
      {claims.map((claim) => {
        const listing = listingName.get(`${claim.target_type}:${claim.target_id}`);
        return (
          <li key={claim.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-base font-medium">{listing?.name ?? "Listing"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {claim.target_type} · {claim.status} · {claim.profiles?.display_name ?? claim.user_id}
            </p>
            {listing ? (
              <p className="mt-1 text-sm">
                <Link href={listing.href} className="font-medium hover:underline">
                  Public page
                </Link>
              </p>
            ) : null}
            <p className="mt-2 text-sm whitespace-pre-wrap">{claim.evidence}</p>
            {claim.status === "pending" ? (
              <div className="mt-3 flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    await decideClaim(claim.id, "approved");
                  }}
                >
                  <Button type="submit">Approve</Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await decideClaim(claim.id, "rejected", "Not enough evidence");
                  }}
                >
                  <Button type="submit" variant="outline">
                    Reject
                  </Button>
                </form>
              </div>
            ) : null}
          </li>
        );
      })}
      {!claims.length ? (
        <p className="text-muted-foreground">No claim requests yet.</p>
      ) : null}
    </ul>
  );
}
