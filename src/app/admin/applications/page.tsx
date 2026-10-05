import Link from "next/link";
import { ApplicationDecisionForm } from "@/components/admin/application-decision";
import { ClaimDecision } from "@/components/admin/claim-decision";
import { fetchAllRows, requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";
import type { ClaimRequest, ClaimTarget, PortalApplication } from "@/types/database";

type ApplicationRow = PortalApplication & {
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null;
};

type ListingRow = { id: string; name: string; slug: string };

function personName(
  profiles?: { display_name: string | null } | { display_name: string | null }[] | null,
) {
  const row = Array.isArray(profiles) ? profiles[0] : profiles;
  return row?.display_name?.trim() || null;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; password?: string; vendor?: string; market?: string }>;
}) {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const params = await searchParams;
  const vendorId = /^[0-9a-f-]{36}$/i.test(params.vendor ?? "") ? params.vendor : null;
  const marketId = /^[0-9a-f-]{36}$/i.test(params.market ?? "") ? params.market : null;

  const [applications, claims] = await Promise.all([
    fetchAllRows<ApplicationRow>((from, to) =>
      supabase
        .from("portal_applications")
        .select(
          "id, user_id, kind, organization_name, requested_target_id, assigned_target_id, status, created_at, profiles(display_name)",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .range(from, to)
        .then((result) => ({
          data: (result.data ?? null) as ApplicationRow[] | null,
          error: result.error,
        })),
    ),
    fetchAllRows<ClaimRequest & { profiles?: { display_name: string | null } | null }>((from, to) =>
      supabase
        .from("claim_requests")
        .select("*, profiles(display_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .range(from, to)
        .then((result) => ({
          data: (result.data ?? null) as (ClaimRequest & { profiles?: { display_name: string | null } | null })[] | null,
          error: result.error,
        })),
    ),
  ]);

  const vendorIds = [
    ...applications.flatMap((row) => (row.kind === "vendor" && row.requested_target_id ? [row.requested_target_id] : [])),
    ...claims.flatMap((claim) => (claim.target_type === "vendor" ? [claim.target_id] : [])),
  ];
  const marketIds = [
    ...applications.flatMap((row) => (row.kind === "market" && row.requested_target_id ? [row.requested_target_id] : [])),
    ...claims.flatMap((claim) => (claim.target_type === "market" ? [claim.target_id] : [])),
  ];
  const userIds = [...new Set(applications.map((row) => row.user_id))];
  const [vendors, markets, emails] = await Promise.all([
    vendorIds.length
      ? supabase.from("vendors").select("id, name, slug").in("id", [...new Set(vendorIds)])
      : Promise.resolve({ data: [] as ListingRow[] }),
    marketIds.length
      ? supabase.from("markets").select("id, name, slug").in("id", [...new Set(marketIds)])
      : Promise.resolve({ data: [] as ListingRow[] }),
    userIds.length
      ? supabase.rpc("auth_emails_for_users", { p_ids: userIds })
      : Promise.resolve({ data: [] as { id: string; email: string | null }[] }),
  ]);

  const listingFor = new Map<string, { id: string; name: string; href: string }>();
  for (const vendor of (vendors.data ?? []) as ListingRow[]) {
    if (!vendor.id || !vendor.name || !vendor.slug) continue;
    listingFor.set(`vendor:${vendor.id}`, { id: vendor.id, name: vendor.name, href: `/vendors/${vendor.slug}` });
  }
  for (const market of (markets.data ?? []) as ListingRow[]) {
    if (!market.id || !market.name || !market.slug) continue;
    listingFor.set(`market:${market.id}`, { id: market.id, name: market.name, href: `/markets/${market.slug}` });
  }
  const emailFor = new Map(
    ((emails.data ?? []) as { id: string; email: string | null }[]).flatMap((row) =>
      row.id ? [[row.id, row.email] as const] : [],
    ),
  );

  return (
    <div className="grid gap-8">
      {params.sent === "0" ? (
        <p className="text-base text-destructive">
          The older request is approved. The email did not send.
          {params.password === "1" ? (
            <>
              {" "}
              The one-time password is on that {marketId ? "market" : "vendor"}
              &apos;s{" "}
              {marketId ? (
                <Link href={`/admin/markets/${marketId}`} className="font-medium underline">
                  admin page
                </Link>
              ) : vendorId ? (
                <Link href={`/admin/vendors/${vendorId}`} className="font-medium underline">
                  admin page
                </Link>
              ) : (
                "admin page"
              )}
              .
            </>
          ) : null}
        </p>
      ) : null}

      <section className="grid gap-4">
        <h2>Account requests</h2>
        <p className="text-base text-muted-foreground">
          Accounts waiting for a listing. Assign one and they can edit it. They already chose a password.
        </p>
        {applications.length ? (
          <ul className="grid gap-4">
            {applications.map((application) => {
              const kind = application.kind as ClaimTarget;
              const listing = application.requested_target_id
                ? listingFor.get(`${kind}:${application.requested_target_id}`) ?? null
                : null;
              const email = emailFor.get(application.user_id);
              const name = personName(application.profiles) || email || "Account";
              return (
                <li key={application.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <p className="text-base font-medium">{name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {kind === "vendor" ? "Vendor" : "Market"}
                    {email ? ` · ${email}` : ""}
                    {application.organization_name ? ` · ${application.organization_name}` : ""}
                  </p>
                  {listing ? (
                    <p className="mt-2 text-sm">
                      <Link href={listing.href} className="font-medium hover:underline">
                        {listing.name}
                      </Link>
                    </p>
                  ) : null}
                  <ApplicationDecisionForm
                    id={application.id}
                    kind={kind}
                    suggested={listing ? { id: listing.id, name: listing.name } : null}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">No account requests waiting.</p>
        )}
      </section>

      {claims.length ? (
        <section className="grid gap-4">
          <h2>Older requests</h2>
          <ul className="grid gap-4">
            {claims.map((claim) => {
              const listing = listingFor.get(`${claim.target_type}:${claim.target_id}`);
              return (
                <li key={claim.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <p className="text-base font-medium">{listing?.name ?? "Listing"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {claim.target_type === "market" ? "Market" : "Vendor"} ·{" "}
                    {personName(claim.profiles) ?? "Account"}
                  </p>
                  {listing ? (
                    <p className="mt-2 text-sm">
                      <Link href={listing.href} className="font-medium hover:underline">
                        Public page
                      </Link>
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm whitespace-pre-wrap">{claim.evidence}</p>
                  <ClaimDecision id={claim.id} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
