import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { confirmStallCheckout, reconcileBuyerOrder } from "@/lib/stall-payments";
import { BackButton } from "@/components/back-button";
import { OrderCancel } from "@/components/order-cancel";
import { formatPrice } from "@/lib/format";
import {
  formatTorontoStamp,
  fulfillmentLabel,
  orderIsReady,
  orderStatusLabel,
  shopperCancelAllowed,
  shopperRefundWindowCopy,
} from "@/lib/selling";
import { pageMeta } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/admin";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vendor-portal";
import { copyText, siteCopy } from "@/content/site-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: siteCopy["/vendors/[slug]/orders/[orderId]"].title,
  path: "/vendors",
  description: copyText(siteCopy["/vendors/[slug]/orders/[orderId]"].description),
  index: false,
});

export default async function StallOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; orderId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug, orderId } = await params;
  const query = await searchParams;
  if (!isUuid(orderId)) notFound();
  const sessionId = query.session_id?.startsWith("cs_") ? query.session_id : null;
  const receiptPath = sessionId
    ? `/vendors/${slug}/orders/${orderId}?session_id=${encodeURIComponent(sessionId)}`
    : `/vendors/${slug}/orders/${orderId}`;
  const { user } = await createAuthedServerClient();
  if (!user) redirect(`/login?next=${encodeURIComponent(receiptPath)}`);

  let order = null;
  let confirmFailed = false;
  if (sessionId) {
    const confirmed = await confirmStallCheckout({
      orderId,
      buyerId: user.id,
      sessionId,
    });
    order = confirmed.order;
    confirmFailed = confirmed.confirmFailed;
  }
  if (!order) {
    const db = createServiceClient();
    if (!db) notFound();
    const { data } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!data || data.buyer_id !== user.id) notFound();
    order = data;
  }
  if (!order) notFound();
  const reconciled = await reconcileBuyerOrder(String(order.id), user.id);
  if (reconciled) order = reconciled;

  const db = createServiceClient();
  const vendor = db
    ? (await db.from("vendors").select("name, slug").eq("id", order.vendor_id).maybeSingle()).data
    : null;
  if (vendor && vendor.slug !== slug) {
    const next = sessionId
      ? `/vendors/${vendor.slug}/orders/${orderId}?session_id=${encodeURIComponent(sessionId)}`
      : `/vendors/${vendor.slug}/orders/${orderId}`;
    redirect(next);
  }

  const waiting = order.status === "pending" || order.status === "expired";
  const confirming = confirmFailed && waiting;
  const reserved = order.status === "reserved";
  const serviceFee = "service_fee_cents" in order && typeof order.service_fee_cents === "number" ? order.service_fee_cents : 0;
  const readyAt = "ready_at" in order && typeof order.ready_at === "string" ? order.ready_at : null;
  const pickupStarts =
    "pickup_starts_at" in order && typeof order.pickup_starts_at === "string" ? order.pickup_starts_at : null;
  const pickupStamp = pickupStarts ? formatTorontoStamp(pickupStarts) : null;
  const disputedAt = "disputed_at" in order && typeof order.disputed_at === "string" ? order.disputed_at : null;
  const pickupName = "pickup_name" in order && typeof order.pickup_name === "string" ? order.pickup_name : null;
  const marketName = "market_name" in order && typeof order.market_name === "string" ? order.market_name : null;
  const status = String(order.status);
  const ready = orderIsReady(status, readyAt);
  const canCancel = shopperCancelAllowed({
    status,
    readyAt,
    pickupStartsAt: pickupStarts,
    disputedAt,
  });
  const windowCopy = shopperRefundWindowCopy({
    status,
    readyAt,
    pickupStartsAt: pickupStarts,
    disputedAt,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <BackButton href={`/vendors/${slug}`} />
      <h1>
        {confirming
          ? siteCopy["/vendors/[slug]/orders/[orderId]"].confirming
          : waiting
            ? siteCopy["/vendors/[slug]/orders/[orderId]"].notFinished
            : ready
              ? siteCopy["/vendors/[slug]/orders/[orderId]"].ready
              : reserved
                ? siteCopy["/vendors/[slug]/orders/[orderId]"].reservation
                : siteCopy["/vendors/[slug]/orders/[orderId]"].placed}
      </h1>
      <p className="type-lede mt-2 text-muted-foreground">
        {confirming ? (
          siteCopy["/vendors/[slug]/orders/[orderId]"].confirmingCaption
        ) : (
          <>
            {vendor?.name ? (
              <Link href={`/vendors/${vendor.slug}`} className="font-medium text-foreground hover:underline">
                {vendor.name}
              </Link>
            ) : (
              siteCopy["/vendors/[slug]/orders/[orderId]"].theStall
            )}{" "}
            {waiting
              ? "has not been paid yet."
              : reserved
                ? "is holding this reservation. Pay at the stall and show ID."
                : "has this order."}{" "}
            {orderStatusLabel(status, readyAt)}.
          </>
        )}
      </p>
      {windowCopy ? <p className="mt-4 text-base text-muted-foreground">{windowCopy}</p> : null}
      <p className="mt-6 text-base font-medium">{order.item_name}</p>
      <p className="type-nums mt-1 text-base">
        {order.quantity} · {formatPrice(order.charge_cents)}
        {serviceFee > 0
          ? ` plus ${formatPrice(serviceFee)} service fee · ${formatPrice(order.charge_cents + serviceFee)}`
          : ""}{" "}
        · {fulfillmentLabel(order.fulfillment)}
        {marketName ? ` · ${marketName}` : ""}
        {pickupStamp ? ` · ${pickupStamp}` : ""}
      </p>
      {pickupName ? <p className="mt-3 text-base">{pickupName}</p> : null}
      {canCancel ? <OrderCancel orderId={String(order.id)} /> : null}
      {order.fulfillment_note ? (
        <p className="mt-3 whitespace-pre-wrap text-base text-muted-foreground">{order.fulfillment_note}</p>
      ) : null}
      {order.delivery_line1 ? (
        <p className="mt-3 text-base text-muted-foreground">
          {[order.delivery_name, order.delivery_line1, order.delivery_city, order.delivery_region, order.delivery_postal]
            .filter(Boolean)
            .join(", ")}
        </p>
      ) : null}
      {order.terms_snapshot ? (
        <div className="mt-8">
          <h2>{siteCopy["/vendors/[slug]/orders/[orderId]"].stallTerms}</h2>
          <p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">{order.terms_snapshot}</p>
        </div>
      ) : null}
      <p className="mt-8 text-base">
        <Link href="/account" className="font-medium hover:underline">
          Your orders
        </Link>
      </p>
    </div>
  );
}
