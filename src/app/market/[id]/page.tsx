import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { MarketPortalEditor } from "@/components/market-portal-editor";
import { loadMarketPortal } from "@/app/actions/market-portal";
import { SITE_NAME } from "@/lib/constants";
import { pageMeta } from "@/lib/seo";
import { isUuid } from "@/lib/vendor-portal";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Edit your market",
  path: "/market",
  description: `Update a ${SITE_NAME} market you run.`,
  index: false,
});

export default async function MarketEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const portal = await loadMarketPortal();
  if (!portal.signedIn) redirect(`/login?next=${encodeURIComponent(`/market/${id}`)}`);
  if (portal.error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <BackButton href="/market" />
        <h1>Your market</h1>
        <p className="type-lede mt-2 text-muted-foreground">
          The market editor is not available yet. Try again in a minute.
        </p>
      </div>
    );
  }

  const listing = portal.listings.find((row) => row.id === id);
  if (!listing) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <BackButton href="/market" />
      <h1>{listing.name}</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        {listing.status === "published" ? (
          <>
            Published.{" "}
            <Link href={`/markets/${listing.slug}`} className="font-medium text-foreground hover:underline">
              View the public page
            </Link>
            .
          </>
        ) : (
          "Draft. This market is not on the public site yet."
        )}
      </p>
      <div className="mt-8">
        <MarketPortalEditor listing={listing} />
      </div>
    </div>
  );
}
