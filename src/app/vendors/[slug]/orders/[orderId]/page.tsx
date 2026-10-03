import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { confirmStallCheckout } from "@/lib/stall-payments";
import { BackButton } from "@/components/back-button";
import { formatPrice } from "@/lib/format";
import { fulfillmentLabel, orderStatusLabel } from "@/lib/selling";
import { pageMeta } from "@/lib/seo";
import { createServiceClient } from "@/lib/supabase/admin";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/vendor-portal";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMeta({
  title: "Order",
  path: "/vendors",
  description: `An order on ${SITE_NAME}.`,
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
  const { user } = await createAuthedServerClient();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/vendors/${slug}/orders/${orderId}`)}`);

  let order = null;
  if (query.session_id?.startsWith("cs_")) {
    order = await confirmStallCheckout({
      orderId,
      buyerId: user.id,
      sessionId: query.session_id,
    });
  }
  if (!order) {
    const db = createServiceClient();
    if (!db) notFound();
    const { data } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!data || data.buyer_id !== user.id) notFound();
    order = data;
  }
  if (!order) notFound();

  const db = createServiceClient();
  const vendor = db
    ? (await db.from("vendors").select("name, slug").eq("id", order.vendor_id).maybeSingle()).data
    : null;
  if (vendor && vendor.slug !== slug) redirect(`/vendors/${vendor.slug}/orders/${orderId}`);

  const waiting = order.status === "pending" || order.status === "expired";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <BackButton href={`/vendors/${slug}`} />
      <h1>{waiting ? "Payment not finished" : "Order placed"}</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        {vendor?.name ? (
          <Link href={`/vendors/${vendor.slug}`} className="font-medium text-foreground hover:underline">
            {vendor.name}
          </Link>
        ) : (
          "The stall"
        )}{" "}
        {waiting
          ? "has not been paid yet."
          : "has this order and will follow the terms you agreed to."}{" "}
        {orderStatusLabel(order.status)}.
      </p>
      <p className="mt-6 text-base font-medium">{order.item_name}</p>
      <p className="type-nums mt-1 text-base">
        {order.quantity} · {formatPrice(order.charge_cents)} · {fulfillmentLabel(order.fulfillment)}
      </p>
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
          <h2>Stall terms</h2>
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
