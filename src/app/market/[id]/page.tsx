import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { MarketPortalEditor } from "@/components/market-portal-editor";
import { loadMarketPortal } from "@/app/actions/market-portal";
import { copyText, siteCopy } from "@/content/site-copy";
import { pageMeta } from "@/lib/seo";
import { isUuid } from "@/lib/vendor-portal";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: siteCopy["/market/[id]"].title,
  path: "/market",
  description: copyText(siteCopy["/market/[id]"].description),
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
        <h1>{siteCopy["/market/[id]"].unavailableTitle}</h1>
        <p className="type-lede mt-2 text-muted-foreground">
          {siteCopy["/market/[id]"].unavailable}
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
            {siteCopy["/market/[id]"].published}{" "}
            <Link href={`/markets/${listing.slug}`} className="font-medium text-foreground hover:underline">
              {siteCopy["/market/[id]"].viewPublic}
            </Link>
            .
          </>
        ) : (
          siteCopy["/market/[id]"].draft
        )}
      </p>
      <div className="mt-8">
        <MarketPortalEditor listing={listing} />
      </div>
    </div>
  );
}
