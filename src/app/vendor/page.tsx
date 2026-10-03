import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { SITE_NAME } from "@/lib/constants";
import { listVendors } from "@/lib/data/catalog";
import { loginQueryError } from "@/lib/public-error";
import { pageMeta } from "@/lib/seo";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { loadVendorPortal } from "@/app/actions/vendor-portal";
import type { ClaimStatus } from "@/types/database";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Your stall",
  path: "/vendor",
  description: `Sign in to update the ${SITE_NAME} stall you run.`,
  index: false,
});

function claimStatus(status: ClaimStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Turned down";
  return "Waiting";
}

export default async function VendorPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error: oauthError }, portal] = await Promise.all([searchParams, loadVendorPortal()]);

  if (!portal.signedIn) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <h1>Your stall</h1>
        <p className="type-lede mt-2 mb-8 text-muted-foreground">
          Sign in to update the listing you run. Same account as the rest of {SITE_NAME}.
        </p>
        <LoginForm next="/vendor" oauthError={loginQueryError(oauthError)} />
      </div>
    );
  }

  if (portal.error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1>Your stall</h1>
        <p className="type-lede mt-2 text-muted-foreground">
          The stall editor is not available yet. Try again in a minute.
        </p>
      </div>
    );
  }

  const { supabase, user } = await createAuthedServerClient();
  const claimRows =
    supabase && user
      ? (
          await supabase
            .from("claim_requests")
            .select("id, target_id, status")
            .eq("user_id", user.id)
            .eq("target_type", "vendor")
            .order("created_at", { ascending: false })
            .limit(20)
        ).data ?? []
      : [];
  const vendors = claimRows.length ? await listVendors() : [];
  const vendorName = new Map(vendors.map((vendor) => [vendor.id, vendor]));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1>Your stall</h1>
      {portal.listings.length ? (
        <>
          <p className="type-lede mt-2 mb-8 text-muted-foreground">
            Update the name, menu, and the markets you sell at. Changes show on the public page.
          </p>
          <ul className="divide-y divide-border ring-1 ring-border">
            {portal.listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/vendor/${listing.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-3 hover:bg-secondary"
                >
                  <span className="min-w-0 text-base font-medium">{listing.name}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {listing.status === "published" ? "Published" : "Draft"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="type-lede mt-2 mb-8 text-muted-foreground">
            Claim a listing while you are signed in. After we approve it, you can edit it here.
          </p>
          <p className="text-base">
            <Link href="/contact" className="font-medium hover:underline">
              Claim a listing
            </Link>
          </p>
        </>
      )}

      {claimRows.length ? (
        <section className="mt-10">
          <h2>Claims</h2>
          <ul className="mt-3 divide-y divide-border ring-1 ring-border">
            {claimRows.map((claim) => {
              const vendor = vendorName.get(claim.target_id);
              const status = claim.status as ClaimStatus;
              return (
                <li
                  key={claim.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-2.5"
                >
                  {vendor ? (
                    <Link href={`/vendors/${vendor.slug}`} className="min-w-0 font-medium hover:underline">
                      {vendor.name}
                    </Link>
                  ) : (
                    <span className="min-w-0 font-medium">Listing</span>
                  )}
                  <span className="shrink-0 text-sm text-muted-foreground">{claimStatus(status)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
