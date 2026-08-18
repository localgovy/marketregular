import { decideClaim } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";
import type { ClaimRequest } from "@/types/database";

export default async function ClaimsPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from("claim_requests")
    .select("*, profiles(display_name)")
    .order("created_at", { ascending: false });

  const claims = (data ?? []) as Array<ClaimRequest & { profiles?: { display_name: string | null } }>;

  return (
    <ul className="grid gap-4">
      {claims.map((claim) => (
        <li key={claim.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">
            {claim.target_type} · {claim.status} · {claim.profiles?.display_name ?? claim.user_id}
          </p>
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
      ))}
      {!claims.length ? (
        <p className="text-muted-foreground">No claim requests yet.</p>
      ) : null}
    </ul>
  );
}
