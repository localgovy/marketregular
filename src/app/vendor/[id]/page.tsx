import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { VendorPortalEditor } from "@/components/vendor-portal-editor";
import { settleStallFeeReturn } from "@/app/actions/selling";
import { loadVendorPortal } from "@/app/actions/vendor-portal";
import { SITE_NAME } from "@/lib/constants";
import { refreshStallCapabilities } from "@/lib/stall-payments";
import { VENDOR_SALES_OPEN } from "@/lib/selling";
import { stripeChargesConfigured, stripeConnectConfigured } from "@/lib/stripe";
import { pageMeta } from "@/lib/seo";
import { UNAFFILIATED_VENDOR_SLUGS } from "@/lib/unaffiliated-vendors";
import { isUuid, vendorPublicPageExists } from "@/lib/vendor-portal";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Edit your stall",
  path: "/vendor",
  description: `Update a ${SITE_NAME} stall you run.`,
  index: false,
});

export default async function VendorEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fee?: string; session_id?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!isUuid(id)) notFound();

  if (query.fee === "paid" && query.session_id) {
    await settleStallFeeReturn(id, query.session_id);
  }

  let portal = await loadVendorPortal();
  if (!portal.signedIn) redirect(`/login?next=${encodeURIComponent(`/vendor/${id}`)}`);
  if (portal.error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <BackButton href="/vendor" />
        <h1>Your stall</h1>
        <p className="type-lede mt-2 text-muted-foreground">
          The stall editor is not available yet. Try again in a minute.
        </p>
      </div>
    );
  }

  let listing = portal.listings.find((row) => row.id === id);
  if (!listing) notFound();
  if (
    VENDOR_SALES_OPEN &&
    listing.selling_approved &&
    listing.payments_started &&
    stripeChargesConfigured()
  ) {
    try {
      await refreshStallCapabilities(id);
    } catch (err) {
      console.error("stall capabilities", err instanceof Error ? err.message : "stripe");
    }
    portal = await loadVendorPortal();
    listing = portal.listings.find((row) => row.id === id) ?? listing;
  }

  const feeNote =
    query.fee === "cancelled"
      ? "Payment was not finished."
      : query.fee === "paid"
        ? "If the payment went through, the balance updates here."
        : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <BackButton href="/vendor" />
      <h1>{listing.name}</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        {vendorPublicPageExists(listing.status, listing.stalls.length, UNAFFILIATED_VENDOR_SLUGS.has(listing.slug)) ? (
          <>
            Published.{" "}
            <Link href={`/vendors/${listing.slug}`} className="font-medium text-foreground hover:underline">
              View the public page
            </Link>
            .
          </>
        ) : (
          "Draft. This listing is not on the public site yet."
        )}
      </p>
      <div className="mt-8">
        <VendorPortalEditor
          listing={listing}
          staysWithoutHall={UNAFFILIATED_VENDOR_SLUGS.has(listing.slug)}
          paymentsConfigured={stripeConnectConfigured()}
          feeNote={feeNote}
        />
      </div>
    </div>
  );
}
