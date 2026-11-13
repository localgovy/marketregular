import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { BuyForm } from "@/components/buy-form";
import { MenuItemPhoto } from "@/components/menu-item-photo";
import { formatPrice } from "@/lib/format";
import { menuItemPhotoUrl } from "@/lib/menu-item-photo-url";
import { VENDOR_SALES_OPEN } from "@/lib/selling";
import { loadSellable, loadStallMarkets } from "@/lib/stall-payments";
import { stripeChargesConfigured } from "@/lib/stripe";
import { pageMeta } from "@/lib/seo";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vendor-portal";
import { copyText, siteCopy } from "@/content/site-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: siteCopy["/vendors/[slug]/buy/[itemId]"].title,
  path: "/vendors",
  description: copyText(siteCopy["/vendors/[slug]/buy/[itemId]"].description),
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
  const item = await loadSellable(slug, itemId);
  if (!item) notFound();
  if (!item.reserve && !stripeChargesConfigured()) notFound();
  const markets = await loadStallMarkets(item.vendor_id);
  const price = formatPrice(item.price_cents);

  const photo = menuItemPhotoUrl(item.image_url, item.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <BackButton href={`/vendors/${slug}`} />
      {photo ? (
        <div className="flex items-start gap-3">
          <MenuItemPhoto url={photo} menuId={item.id} />
          <div className="min-w-0">
            <h1>{item.name}</h1>
            <p className="type-lede mt-2 text-muted-foreground">{item.vendor_name}</p>
            {item.reserve ? (
            <p className="mt-3 text-base text-muted-foreground">Pay at the stall</p>
          ) : price ? (
            <p className="type-nums mt-3 text-base">{price}</p>
          ) : null}
          </div>
        </div>
      ) : (
        <>
          <h1>{item.name}</h1>
          <p className="type-lede mt-2 text-muted-foreground">{item.vendor_name}</p>
          {item.reserve ? (
            <p className="mt-3 text-base text-muted-foreground">Pay at the stall</p>
          ) : price ? (
            <p className="type-nums mt-3 text-base">{price}</p>
          ) : null}
        </>
      )}
      <BuyForm
        vendorSlug={slug}
        itemId={item.id}
        priceCents={item.price_cents}
        offers={{
          delivery: false,
          pickup: item.offer_pickup,
          preorder: item.offer_preorder,
        }}
        terms={item.offer_terms}
        cancelled={query.cancelled === "1"}
        markets={markets}
        reserve={item.reserve}
      />
    </div>
  );
}
