import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { BuyForm } from "@/components/buy-form";
import { formatPrice } from "@/lib/format";
import { VENDOR_SALES_OPEN } from "@/lib/selling";
import { loadSellable } from "@/lib/stall-payments";
import { stripeChargesConfigured } from "@/lib/stripe";
import { pageMeta } from "@/lib/seo";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vendor-portal";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Buy",
  path: "/vendors",
  description: `Pay a stall on ${SITE_NAME}.`,
  index: false,
});

export default async function BuyItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; itemId: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const { slug, itemId } = await params;
  const query = await searchParams;
  if (!isUuid(itemId) || !VENDOR_SALES_OPEN) notFound();
  const { user } = await createAuthedServerClient();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/vendors/${slug}/buy/${itemId}`)}`);
  if (!stripeChargesConfigured()) notFound();
  const item = await loadSellable(slug, itemId);
  if (!item) notFound();
  const price = formatPrice(item.price_cents);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <BackButton href={`/vendors/${slug}`} />
      <h1>{item.name}</h1>
      <p className="type-lede mt-2 text-muted-foreground">{item.vendor_name}</p>
      {price ? <p className="type-nums mt-3 text-base">{price}</p> : null}
      <BuyForm
        vendorSlug={slug}
        itemId={item.id}
        priceCents={item.price_cents}
        offers={{
          delivery: item.offer_delivery,
          pickup: item.offer_pickup,
          preorder: item.offer_preorder,
        }}
        terms={item.offer_terms}
        cancelled={query.cancelled === "1"}
      />
    </div>
  );
}
