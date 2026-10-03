import "server-only";

import { headers } from "next/headers";
import { after } from "next/server";
import type Stripe from "stripe";
import { SITE_URL } from "@/lib/constants";
import { originFromHost } from "@/lib/site-host";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import {
  feeAfterRefund,
  MIN_FEE_PAYMENT_CENTS,
  torontoDate,
  type CheckoutDetails,
} from "@/lib/selling";
import { capabilityFlags, getStripe, integrationIdentifier } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";

type OrderRow = {
  id: string;
  buyer_id: string | null;
  vendor_id: string;
  item_name: string;
  unit_price_cents: number;
  quantity: number;
  charge_cents: number;
  fulfillment: string;
  fulfillment_note: string | null;
  delivery_name: string | null;
  delivery_line1: string | null;
  delivery_city: string | null;
  delivery_region: string | null;
  delivery_postal: string | null;
  terms_snapshot: string | null;
  buyer_email: string | null;
  status: string;
  refunded_cents: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
};

async function checkoutOrigin() {
  const headerList = await headers();
  return originFromHost(
    headerList.get("x-forwarded-host") ?? headerList.get("host"),
    headerList.get("x-forwarded-proto"),
    SITE_URL,
  );
}

function feeCheckoutError(err: unknown) {
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  if (
    message.includes("charges") &&
    (message.includes("disabled") || message.includes("cannot") || message.includes("enabled"))
  ) {
    return "The stall fee can be paid once the LOCALGOVY bank account is on Stripe.";
  }
  return "Could not start that payment.";
}

function service() {
  return createServiceClient();
}

function intentId(value: Stripe.Checkout.Session["payment_intent"]) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function paidStatus(chargeCents: number, refundedCents: number) {
  if (refundedCents >= chargeCents) return "refunded";
  if (refundedCents > 0) return "partially_refunded";
  return "paid";
}

async function vendorSlug(vendorId: string) {
  const db = service();
  if (!db) return null;
  const { data } = await db.from("vendors").select("slug").eq("id", vendorId).maybeSingle();
  return typeof data?.slug === "string" ? data.slug : null;
}

export async function refreshStallCapabilities(vendorId: string) {
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return null;
  const { data: row } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id, card_payments_active, payouts_active")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!row || typeof row.stripe_account_id !== "string") return null;
  const accountId = row.stripe_account_id;
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.merchant"],
  });
  const flags = capabilityFlags(account);
  const changed =
    flags.cardPaymentsActive !== row.card_payments_active ||
    flags.payoutsActive !== row.payouts_active;
  if (changed) {
    await db
      .from("vendor_stripe_accounts")
      .update({
        card_payments_active: flags.cardPaymentsActive,
        payouts_active: flags.payoutsActive,
        updated_at: new Date().toISOString(),
      })
      .eq("vendor_id", vendorId);
    const slug = await vendorSlug(vendorId);
    const paths = [`/vendor/${vendorId}`, slug ? `/vendors/${slug}` : ""];
    // updateTag cannot run during render. The stall editor calls this while rendering.
    after(() => {
      revalidatePublishedDirectory(paths);
    });
  }
  return flags;
}

async function findCreatedStallAccount(stripe: Stripe, vendorId: string) {
  const listed = await stripe.v2.core.accounts.list({
    limit: 100,
    applied_configurations: ["merchant"],
  });
  return listed.data.find((account) => account.metadata?.vendor_id === vendorId) ?? null;
}

async function saveStallAccount(
  vendorId: string,
  accountId: string,
  flags: { cardPaymentsActive: boolean; payoutsActive: boolean },
) {
  const db = service();
  if (!db) return { error: "Payments are not available yet." as const };
  const { error } = await db.from("vendor_stripe_accounts").insert({
    vendor_id: vendorId,
    stripe_account_id: accountId,
    card_payments_active: flags.cardPaymentsActive,
    payouts_active: flags.payoutsActive,
  });
  if (!error) return { error: null };
  const { data: raced } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (typeof raced?.stripe_account_id === "string") return { error: null };
  console.error("stall account save", error.code);
  return { error: "Could not save the payment account." as const };
}

export async function createStallAccount(input: {
  vendorId: string;
  displayName: string;
  email: string;
}) {
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return { error: "Payments are not available yet." as const, accountId: null };
  const { data: existing } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id")
    .eq("vendor_id", input.vendorId)
    .maybeSingle();
  if (typeof existing?.stripe_account_id === "string") {
    return { error: null, accountId: existing.stripe_account_id };
  }

  const reused = await findCreatedStallAccount(stripe, input.vendorId);
  if (reused) {
    const saved = await saveStallAccount(input.vendorId, reused.id, capabilityFlags(reused));
    if (saved.error) return { error: saved.error, accountId: null };
    return { error: null, accountId: reused.id };
  }

  const account = await stripe.v2.core.accounts.create({
    display_name: input.displayName.slice(0, 200),
    contact_email: input.email,
    dashboard: "full",
    identity: { country: "ca" },
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { requested: true },
        },
      },
    },
    defaults: {
      currency: "cad",
      locales: ["en-CA"],
      responsibilities: {
        fees_collector: "stripe",
        losses_collector: "stripe",
      },
    },
    metadata: { vendor_id: input.vendorId },
    include: ["configuration.merchant"],
  });
  const flags = capabilityFlags(account);
  const saved = await saveStallAccount(input.vendorId, account.id, flags);
  if (saved.error) return { error: saved.error, accountId: null };
  return { error: null, accountId: account.id };
}

export async function createAccountSession(vendorId: string) {
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return null;
  const { data } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  const accountId = data?.stripe_account_id;
  if (typeof accountId !== "string") return null;
  const session = await stripe.accountSessions.create({
    account: accountId,
    components: {
      account_onboarding: { enabled: true },
      notification_banner: { enabled: true },
      account_management: { enabled: true },
      payments: { enabled: true },
      payouts: { enabled: true },
    },
  });
  return session.client_secret;
}

async function loadOrder(id: string) {
  const db = service();
  if (!db) return null;
  const { data } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  return (data as OrderRow | null) ?? null;
}

async function syncFee(order: OrderRow) {
  const db = service();
  if (!db) return;
  if (order.status === "pending" || order.status === "expired") return;
  const parts = feeAfterRefund(order.charge_cents, order.refunded_cents);
  const { data: existing } = await db
    .from("platform_fees")
    .select("earned_on")
    .eq("order_id", order.id)
    .maybeSingle();
  const earnedOn =
    typeof existing?.earned_on === "string" ? existing.earned_on : torontoDate();
  const row = {
    vendor_id: order.vendor_id,
    order_id: order.id,
    percent_cents: parts.voided ? 0 : parts.percentCents,
    flat_cents: parts.voided ? 0 : parts.flatCents,
    voided: parts.voided,
    earned_on: earnedOn,
  };
  if (existing) {
    await db.from("platform_fees").update(row).eq("order_id", order.id);
    return;
  }
  const { error } = await db.from("platform_fees").insert(row);
  if (error && error.code !== "23505") console.error("stall fee", error.code);
}

export async function recordStallCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "stall_order") return;
  if (session.payment_status !== "paid") return;
  const orderId = session.metadata.order_id;
  if (!orderId) return;
  const order = await loadOrder(orderId);
  if (!order) return;
  if (session.amount_total !== order.charge_cents) {
    console.error("stall checkout amount mismatch", session.id);
    return;
  }
  if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id) {
    console.error("stall checkout session mismatch", session.id);
    return;
  }
  const db = service();
  if (!db) return;
  const next = paidStatus(order.charge_cents, order.refunded_cents);
  if (order.status === "pending" || order.status === "expired" || order.status === "paid") {
    await db
      .from("orders")
      .update({
        status: order.status === "paid" ? paidStatus(order.charge_cents, order.refunded_cents) : next,
        paid_at: order.paid_at ?? new Date().toISOString(),
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: intentId(session.payment_intent) ?? order.stripe_payment_intent_id,
      })
      .eq("id", order.id)
      .in("status", ["pending", "expired", "paid"]);
  }
  const fresh = await loadOrder(order.id);
  if (fresh) await syncFee(fresh);
  const slug = await vendorSlug(order.vendor_id);
  revalidatePublishedDirectory([slug ? `/vendors/${slug}` : ""]);
}

export async function recordPlatformFee(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "platform_fee") return;
  if (session.payment_status !== "paid") return;
  const vendorId = session.metadata.vendor_id;
  const amount = session.amount_total;
  if (!vendorId || amount == null || amount < MIN_FEE_PAYMENT_CENTS) return;
  const db = service();
  if (!db) return;
  const { error } = await db.from("platform_fee_payments").insert({
    vendor_id: vendorId,
    amount_cents: amount,
    stripe_checkout_session_id: session.id,
  });
  if (error && error.code !== "23505") console.error("stall fee payment", error.code);
  revalidatePublishedDirectory([`/vendor/${vendorId}`]);
}

export async function expireStallCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "stall_order") return;
  const orderId = session.metadata.order_id;
  if (!orderId) return;
  const db = service();
  if (!db) return;
  await db
    .from("orders")
    .update({ status: "expired", stripe_checkout_session_id: session.id })
    .eq("id", orderId)
    .eq("status", "pending");
}

export async function applyStallRefund(charge: Stripe.Charge, stripeAccount: string | null) {
  const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!paymentIntent) return;
  const db = service();
  const stripe = getStripe();
  if (!db || !stripe) return;
  let order: OrderRow | null = null;
  const { data } = await db
    .from("orders")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntent)
    .maybeSingle();
  order = (data as OrderRow | null) ?? null;
  if (!order && stripeAccount) {
    const listed = await stripe.checkout.sessions.list(
      { payment_intent: paymentIntent, limit: 1 },
      { stripeAccount },
    );
    const session = listed.data[0];
    const orderId = session?.metadata?.order_id;
    if (orderId) order = await loadOrder(orderId);
  }
  if (!order) return;
  const refunded = Math.min(order.charge_cents, Math.max(order.refunded_cents, charge.amount_refunded));
  const status =
    order.status === "pending" || order.status === "expired"
      ? order.status
      : paidStatus(order.charge_cents, refunded);
  await db
    .from("orders")
    .update({
      refunded_cents: refunded,
      status,
      stripe_payment_intent_id: paymentIntent,
    })
    .eq("id", order.id);
  const fresh = await loadOrder(order.id);
  if (fresh) await syncFee(fresh);
}

export async function syncAccountEvent(accountId: string) {
  const db = service();
  if (!db) return;
  const { data } = await db
    .from("vendor_stripe_accounts")
    .select("vendor_id")
    .eq("stripe_account_id", accountId)
    .maybeSingle();
  if (typeof data?.vendor_id === "string") await refreshStallCapabilities(data.vendor_id);
}

type Sellable = {
  id: string;
  vendor_id: string;
  name: string;
  price_cents: number;
  offer_delivery: boolean;
  offer_pickup: boolean;
  offer_preorder: boolean;
  offer_terms: string | null;
  can_buy: boolean;
  vendor_name: string;
  vendor_slug: string;
  stripe_account_id: string;
};

export async function loadSellable(slug: string, itemId: string): Promise<Sellable | null> {
  const db = service();
  if (!db) return null;
  const { data: vendor } = await db
    .from("published_vendors")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!vendor || vendor.slug !== slug) return null;
  const { data: item } = await db
    .from("published_menus")
    .select(
      "id, vendor_id, name, price_cents, offer_delivery, offer_pickup, offer_preorder, offer_terms, can_buy",
    )
    .eq("id", itemId)
    .eq("vendor_id", vendor.id)
    .maybeSingle();
  if (!item?.can_buy || typeof item.price_cents !== "number") return null;
  const { data: account } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id, card_payments_active")
    .eq("vendor_id", vendor.id)
    .maybeSingle();
  if (!account?.card_payments_active || typeof account.stripe_account_id !== "string") return null;
  return {
    id: item.id,
    vendor_id: vendor.id,
    name: item.name,
    price_cents: item.price_cents,
    offer_delivery: item.offer_delivery,
    offer_pickup: item.offer_pickup,
    offer_preorder: item.offer_preorder,
    offer_terms: item.offer_terms,
    can_buy: true,
    vendor_name: vendor.name,
    vendor_slug: vendor.slug,
    stripe_account_id: account.stripe_account_id,
  };
}

export async function startStallCheckout(input: {
  sellable: Sellable;
  buyerId: string;
  email: string | null;
  details: CheckoutDetails;
}) {
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return { error: "Payments are not available yet." as const };
  const flags = await refreshStallCapabilities(input.sellable.vendor_id);
  if (!flags?.cardPaymentsActive) return { error: "This stall cannot take a card yet." as const };

  const { details, sellable, buyerId } = input;
  const chargeCents = sellable.price_cents * details.quantity;
  const { data: inserted, error } = await db
    .from("orders")
    .insert({
      buyer_id: buyerId,
      vendor_id: sellable.vendor_id,
      menu_item_id: sellable.id,
      item_name: sellable.name,
      unit_price_cents: sellable.price_cents,
      quantity: details.quantity,
      charge_cents: chargeCents,
      fulfillment: details.fulfillment,
      fulfillment_note: details.note,
      delivery_name: details.delivery?.name ?? null,
      delivery_line1: details.delivery?.line1 ?? null,
      delivery_city: details.delivery?.city ?? null,
      delivery_region: details.delivery?.region ?? null,
      delivery_postal: details.delivery?.postal ?? null,
      terms_snapshot: sellable.offer_terms,
      buyer_email: input.email,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !inserted) return { error: "Could not start that order." as const };

  const orderId = inserted.id as string;
  const origin = await checkoutOrigin();
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        integration_identifier: integrationIdentifier("stall_checkout"),
        customer_email: input.email ?? undefined,
        client_reference_id: orderId,
        metadata: {
          kind: "stall_order",
          order_id: orderId,
          vendor_id: sellable.vendor_id,
        },
        line_items: [
          {
            quantity: details.quantity,
            price_data: {
              currency: "cad",
              unit_amount: sellable.price_cents,
              product_data: {
                name: sellable.name.slice(0, 120),
                description: sellable.vendor_name.slice(0, 200),
              },
            },
          },
        ],
        success_url: `${origin}/vendors/${sellable.vendor_slug}/orders/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/vendors/${sellable.vendor_slug}/buy/${sellable.id}?cancelled=1`,
      },
      {
        stripeAccount: sellable.stripe_account_id,
        idempotencyKey: `stall-order-${orderId}`,
      },
    );
    if (!session.url) {
      await db.from("orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending");
      return { error: "Could not start that payment." as const };
    }
    await db
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId);
    return { error: null, url: session.url };
  } catch (err) {
    console.error("stall checkout", err instanceof Error ? err.message : "stripe");
    await db.from("orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending");
    return { error: "Could not start that payment." as const };
  }
}

export async function confirmStallCheckout(input: {
  orderId: string;
  buyerId: string;
  sessionId: string;
}) {
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return null;
  const order = await loadOrder(input.orderId);
  if (!order || order.buyer_id !== input.buyerId) return null;
  const { data: account } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id")
    .eq("vendor_id", order.vendor_id)
    .maybeSingle();
  const accountId = account?.stripe_account_id;
  if (typeof accountId !== "string") return order;
  try {
    const session = await stripe.checkout.sessions.retrieve(input.sessionId, {}, {
      stripeAccount: accountId,
    });
    if (session.metadata?.order_id !== order.id) return order;
    await recordStallCheckout(session);
  } catch (err) {
    console.error("stall checkout confirm", err instanceof Error ? err.message : "stripe");
    return order;
  }
  return loadOrder(order.id);
}

export async function startFeeCheckout(vendorId: string, balanceCents: number, email: string | null) {
  const stripe = getStripe();
  if (!stripe) return { error: "Payments are not available yet." as const, url: null };
  if (balanceCents < MIN_FEE_PAYMENT_CENTS) {
    return { error: "The balance is under $0.50." as const, url: null };
  }
  const origin = await checkoutOrigin();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      integration_identifier: integrationIdentifier("stall_fee"),
      customer_email: email ?? undefined,
      metadata: { kind: "platform_fee", vendor_id: vendorId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: balanceCents,
            product_data: { name: "MarketRegular stall fee" },
          },
        },
      ],
      success_url: `${origin}/vendor/${vendorId}?fee=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/vendor/${vendorId}?fee=cancelled`,
    });
    if (!session.url) return { error: "Could not start that payment." as const, url: null };
    return { error: null, url: session.url };
  } catch (err) {
    console.error("stall fee checkout", err instanceof Error ? err.message : "stripe");
    return { error: feeCheckoutError(err), url: null };
  }
}

export async function confirmFeeCheckout(vendorId: string, sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.vendor_id !== vendorId) return;
  await recordPlatformFee(session);
}
