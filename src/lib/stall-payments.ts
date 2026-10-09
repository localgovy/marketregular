import "server-only";

import { after } from "next/server";
import type Stripe from "stripe";
import { SITE_URL } from "@/lib/constants";
import { checkoutSiteOrigin } from "@/lib/site-host";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import {
  checkoutAmountMatches,
  feeAfterRefund,
  feeCreditAfterReturn,
  MIN_FEE_PAYMENT_CENTS,
  platformFeeBinds,
  returnedCents,
  stallCheckoutBinds,
  stallExpireBinds,
  torontoDate,
  VENDOR_SALES_OPEN,
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

function checkoutOrigin() {
  return checkoutSiteOrigin(SITE_URL);
}

function feeCheckoutError(err: unknown) {
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  if (
    message.includes("charges") &&
    (message.includes("disabled") || message.includes("cannot") || message.includes("enabled"))
  ) {
    return "The stall fee can be paid once the bank account is on Stripe.";
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

function refreshDirectoryLater(paths: string[]) {
  const extra = paths.filter((path) => path.length > 0);
  after(() => {
    revalidatePublishedDirectory(extra);
  });
}

function checkoutEmail(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email?.trim();
  if (!email || email.length > 320) return null;
  return email;
}

function paymentIntentId(value: string | Stripe.PaymentIntent | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
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
    // updateTag cannot run during render. The stall editor calls this while rendering.
    refreshDirectoryLater([`/vendor/${vendorId}`, slug ? `/vendors/${slug}` : ""]);
  }
  return flags;
}

async function saveStallAccount(
  vendorId: string,
  accountId: string,
  ownerUserId: string,
  flags: { cardPaymentsActive: boolean; payoutsActive: boolean },
) {
  const db = service();
  if (!db) return { error: "Payments are not available yet." as const };
  const { error } = await db.from("vendor_stripe_accounts").insert({
    vendor_id: vendorId,
    stripe_account_id: accountId,
    owner_user_id: ownerUserId,
    card_payments_active: flags.cardPaymentsActive,
    payouts_active: flags.payoutsActive,
  });
  if (!error) return { error: null };
  const { data: raced } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id, owner_user_id")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (raced?.owner_user_id === ownerUserId && typeof raced.stripe_account_id === "string") {
    return { error: null };
  }
  console.error("stall account save", error.code);
  return { error: "Could not save the payment account." as const };
}

export async function createStallAccount(input: {
  vendorId: string;
  userId: string;
  displayName: string;
  email: string;
}) {
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return { error: "Payments are not available yet." as const, accountId: null };
  const { data: vendor } = await db
    .from("vendors")
    .select("claimed_by")
    .eq("id", input.vendorId)
    .maybeSingle();
  if (vendor?.claimed_by !== input.userId) {
    return { error: "That stall is not yours." as const, accountId: null };
  }
  const { data: existing } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id, owner_user_id")
    .eq("vendor_id", input.vendorId)
    .maybeSingle();
  if (
    typeof existing?.stripe_account_id === "string" &&
    existing.owner_user_id === input.userId
  ) {
    return { error: null, accountId: existing.stripe_account_id };
  }
  if (existing) {
    await db.from("vendor_stripe_accounts").delete().eq("vendor_id", input.vendorId);
  }

  // A full-dashboard account can edit its own metadata, so vendor_id there is not
  // proof of ownership. The idempotency key retries the account this owner created.
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
    metadata: { vendor_id: input.vendorId, owner_user_id: input.userId },
    include: ["configuration.merchant"],
  }, {
    idempotencyKey: `stall-account-${input.vendorId}-${input.userId}`,
  });
  const flags = capabilityFlags(account);
  const saved = await saveStallAccount(input.vendorId, account.id, input.userId, flags);
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

async function stallAccountId(vendorId: string) {
  const db = service();
  if (!db) return null;
  const { data } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  return typeof data?.stripe_account_id === "string" ? data.stripe_account_id : null;
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

export async function recordStallCheckout(
  session: Stripe.Checkout.Session,
  stripeAccount: string | null,
) {
  if (session.metadata?.kind !== "stall_order") return;
  if (session.payment_status !== "paid") return;
  const orderId = session.metadata.order_id;
  if (!orderId) return;
  const order = await loadOrder(orderId);
  if (!order) return;
  if (
    !checkoutAmountMatches(
      session.currency,
      session.amount_subtotal,
      session.amount_total,
      order.charge_cents,
    )
  ) {
    console.error("stall checkout amount mismatch", session.id);
    return;
  }
  const vendorAccount = await stallAccountId(order.vendor_id);
  if (
    !stallCheckoutBinds({
      storedSessionId: order.stripe_checkout_session_id,
      sessionId: session.id,
      eventAccount: stripeAccount,
      vendorAccount,
    })
  ) {
    console.error("stall checkout session mismatch", session.id);
    return;
  }
  const db = service();
  if (!db) return;
  const buyerEmail = order.buyer_email ?? checkoutEmail(session);
  const next = paidStatus(order.charge_cents, order.refunded_cents);
  if (order.status === "pending" || order.status === "expired" || order.status === "paid") {
    const { error } = await db
      .from("orders")
      .update({
        status: next,
        paid_at: order.paid_at ?? new Date().toISOString(),
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: intentId(session.payment_intent) ?? order.stripe_payment_intent_id,
        ...(buyerEmail && !order.buyer_email ? { buyer_email: buyerEmail } : {}),
      })
      .eq("id", order.id)
      .in("status", ["pending", "expired", "paid"]);
    if (error) throw new Error("stall checkout was not recorded");
  }
  const fresh = await loadOrder(order.id);
  if (fresh) await syncFee(fresh);
  const slug = await vendorSlug(order.vendor_id);
  refreshDirectoryLater([slug ? `/vendors/${slug}` : ""]);
}

export async function recordPlatformFee(
  session: Stripe.Checkout.Session,
  stripeAccount: string | null,
) {
  if (session.metadata?.kind !== "platform_fee") return;
  if (session.payment_status !== "paid") return;
  const db = service();
  if (!db) return;
  const { data: expected } = await db
    .from("platform_fee_sessions")
    .select("vendor_id, amount_cents, seller_user_id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  const vendorId = session.metadata.vendor_id ?? null;
  const amount = session.amount_total;
  const expectedVendorId = typeof expected?.vendor_id === "string" ? expected.vendor_id : null;
  const expectedAmountCents =
    typeof expected?.amount_cents === "number" ? expected.amount_cents : null;
  if (
    !platformFeeBinds({
      eventAccount: stripeAccount,
      currency: session.currency,
      expectedVendorId,
      expectedAmountCents,
      sessionVendorId: vendorId,
      paidAmountCents: amount,
    }) ||
    !expectedVendorId ||
    expectedAmountCents == null
  ) {
    return;
  }
  const sellerUserId =
    typeof expected?.seller_user_id === "string" ? expected.seller_user_id : null;
  if (!sellerUserId) return;
  const { error } = await db.from("platform_fee_payments").insert({
    vendor_id: expectedVendorId,
    amount_cents: expectedAmountCents,
    stripe_checkout_session_id: session.id,
    seller_user_id: sellerUserId,
  });
  if (error && error.code !== "23505") console.error("stall fee payment", error.code);
  refreshDirectoryLater([`/vendor/${expectedVendorId}`]);
}

export async function expireStallCheckout(session: Stripe.Checkout.Session) {
  if (session.metadata?.kind !== "stall_order") return;
  const orderId = session.metadata.order_id;
  if (!orderId) return;
  const order = await loadOrder(orderId);
  if (!order || !stallExpireBinds(order.stripe_checkout_session_id, session.id)) return;
  const db = service();
  if (!db) return;
  await db
    .from("orders")
    .update({ status: "expired" })
    .eq("id", orderId)
    .eq("status", "pending")
    .eq("stripe_checkout_session_id", session.id);
}

async function findOrderForCharge(charge: Stripe.Charge, stripeAccount: string | null) {
  const paymentIntent = paymentIntentId(charge.payment_intent);
  if (!paymentIntent) return null;
  const db = service();
  const stripe = getStripe();
  if (!db || !stripe) return null;
  const { data } = await db
    .from("orders")
    .select("*")
    .eq("stripe_payment_intent_id", paymentIntent)
    .maybeSingle();
  if (data) {
    const order = data as OrderRow;
    if (!stripeAccount) return order;
    const accountId = await stallAccountId(order.vendor_id);
    return accountId === stripeAccount ? order : null;
  }
  if (!stripeAccount) return null;
  const listed = await stripe.checkout.sessions.list(
    { payment_intent: paymentIntent, limit: 1 },
    { stripeAccount },
  );
  const sessionId = listed.data[0]?.id;
  if (!sessionId) return null;
  const { data: bySession } = await db
    .from("orders")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (!bySession) return null;
  const order = bySession as OrderRow;
  const accountId = await stallAccountId(order.vendor_id);
  return accountId === stripeAccount ? order : null;
}

async function applyReturnedAmount(order: OrderRow, returned: number, paymentIntent: string | null) {
  const db = service();
  if (!db) return;
  const refunded = returnedCents(order.charge_cents, order.refunded_cents, returned);
  if (
    paymentIntent &&
    order.stripe_payment_intent_id &&
    order.stripe_payment_intent_id !== paymentIntent
  ) {
    return;
  }
  const open = order.status === "pending" || order.status === "expired";
  const status = open ? order.status : paidStatus(order.charge_cents, refunded);
  const patch = {
    refunded_cents: refunded,
    status,
    ...(paymentIntent && !order.stripe_payment_intent_id
      ? { stripe_payment_intent_id: paymentIntent }
      : {}),
  };
  const write = db.from("orders").update(patch).eq("id", order.id).lte("refunded_cents", refunded);
  const { data, error } = await (open
    ? write.in("status", ["pending", "expired"])
    : write.in("status", ["paid", "partially_refunded", "refunded"])
  ).select("id");
  if (error) throw new Error("stall refund was not recorded");
  if (!data?.length && open) {
    const current = await loadOrder(order.id);
    if (current && current.status !== "pending" && current.status !== "expired") {
      await applyReturnedAmount(current, returned, paymentIntent);
      return;
    }
  }
  const fresh = await loadOrder(order.id);
  if (fresh) await syncFee(fresh);
}

async function applyPlatformFeeReturn(charge: Stripe.Charge, returned: number) {
  const paymentIntent = paymentIntentId(charge.payment_intent);
  if (!paymentIntent || charge.amount <= 0) return;
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return;
  const listed = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
  const session = listed.data[0];
  if (session?.metadata?.kind !== "platform_fee") return;
  if (charge.currency?.toLowerCase() !== "cad") return;
  const { data: payment } = await db
    .from("platform_fee_payments")
    .select("amount_cents")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();
  if (typeof payment?.amount_cents !== "number") {
    throw new Error("stall fee payment is not recorded yet");
  }
  const next = feeCreditAfterReturn(payment.amount_cents, charge.amount, returned);
  if (next.action === "keep") return;
  if (next.action === "lower") {
    const { error } = await db
      .from("platform_fee_payments")
      .update({ amount_cents: next.amountCents })
      .eq("stripe_checkout_session_id", session.id)
      .gt("amount_cents", next.amountCents);
    if (error) throw new Error("stall fee credit was not recorded");
  } else {
    const { error } = await db
      .from("platform_fee_payments")
      .delete()
      .eq("stripe_checkout_session_id", session.id);
    if (error) throw new Error("stall fee credit was not recorded");
  }
  const vendorId = session.metadata.vendor_id;
  if (typeof vendorId === "string") refreshDirectoryLater([`/vendor/${vendorId}`]);
}

async function applyChargeReturn(charge: Stripe.Charge, returned: number, stripeAccount: string | null) {
  if (returned <= 0) return;
  if (charge.currency?.toLowerCase() !== "cad") return;
  const order = await findOrderForCharge(charge, stripeAccount);
  if (order) {
    await applyReturnedAmount(order, returned, paymentIntentId(charge.payment_intent));
    return;
  }
  if (!stripeAccount) await applyPlatformFeeReturn(charge, returned);
}

export async function applyStallRefund(charge: Stripe.Charge, stripeAccount: string | null) {
  await applyChargeReturn(charge, charge.amount_refunded, stripeAccount);
}

export async function applyLostDispute(dispute: Stripe.Dispute, stripeAccount: string | null) {
  if (dispute.status !== "lost") return;
  const stripe = getStripe();
  if (!stripe) return;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
  if (!chargeId) return;
  const charge = stripeAccount
    ? await stripe.charges.retrieve(chargeId, {}, { stripeAccount })
    : await stripe.charges.retrieve(chargeId);
  const returned = Math.min(charge.amount, charge.amount_refunded + dispute.amount);
  await applyChargeReturn(charge, returned, stripeAccount);
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
  if (!VENDOR_SALES_OPEN) return null;
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
  const { data: owner } = await db
    .from("vendors")
    .select("claimed_by")
    .eq("id", sellable.vendor_id)
    .maybeSingle();
  if (typeof owner?.claimed_by !== "string") {
    return { error: "This stall cannot take a card yet." as const };
  }

  const { data: inserted, error } = await db
    .from("orders")
    .insert({
      buyer_id: buyerId,
      vendor_id: sellable.vendor_id,
      seller_user_id: owner.claimed_by,
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
        automatic_tax: { enabled: false },
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
    const saved = await db
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", orderId)
      .eq("status", "pending")
      .select("id");
    if (saved.error || !saved.data?.length) {
      await db.from("orders").update({ status: "expired" }).eq("id", orderId).eq("status", "pending");
      return { error: "Could not start that payment." as const };
    }
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
    await recordStallCheckout(session, accountId);
  } catch (err) {
    console.error("stall checkout confirm", err instanceof Error ? err.message : "stripe");
  }
  return (await loadOrder(order.id)) ?? order;
}

async function rememberFeeSession(
  vendorId: string,
  sessionId: string,
  amountCents: number,
  sellerUserId: string,
) {
  const db = service();
  if (!db) return false;
  const { error } = await db.from("platform_fee_sessions").insert({
    stripe_checkout_session_id: sessionId,
    vendor_id: vendorId,
    amount_cents: amountCents,
    seller_user_id: sellerUserId,
  });
  if (!error) return true;
  if (error.code !== "23505") {
    console.error("stall fee session", error.code);
    return false;
  }
  const { data } = await db
    .from("platform_fee_sessions")
    .select("vendor_id, amount_cents, seller_user_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return (
    data?.vendor_id === vendorId &&
    data?.amount_cents === amountCents &&
    data?.seller_user_id === sellerUserId
  );
}

export async function startFeeCheckout(
  vendorId: string,
  balanceCents: number,
  email: string | null,
  sellerUserId: string,
) {
  const stripe = getStripe();
  if (!stripe) return { error: "Payments are not available yet." as const, url: null };
  if (balanceCents < MIN_FEE_PAYMENT_CENTS) {
    return { error: "The balance is under $0.50." as const, url: null };
  }
  const origin = await checkoutOrigin();
  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      integration_identifier: "marketregular_stall_fee",
      automatic_tax: { enabled: false },
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
    };
    const baseKey = `stall-fee-${vendorId}-${balanceCents}-${origin}`;
    let session = await stripe.checkout.sessions.create(params, {
      idempotencyKey: baseKey.slice(0, 255),
    });
    const payable =
      session.payment_status === "paid" || (session.status === "open" && Boolean(session.url));
    if (!payable) {
      session = await stripe.checkout.sessions.create(params, {
        idempotencyKey: `${baseKey}-${session.id}`.slice(0, 255),
      });
    }
    const remembered = await rememberFeeSession(vendorId, session.id, balanceCents, sellerUserId);
    if (!remembered) return { error: "Could not start that payment." as const, url: null };
    if (session.payment_status === "paid") {
      await recordPlatformFee(session, null);
      return {
        error: null,
        url: `${origin}/vendor/${vendorId}?fee=paid&session_id=${session.id}`,
      };
    }
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
  await recordPlatformFee(session, null);
}
