import "server-only";

import { after } from "next/server";
import type Stripe from "stripe";
import { SITE_URL } from "@/lib/constants";
import { checkoutSiteOrigin } from "@/lib/site-host";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import {
  applicationFeeCents,
  checkoutAmountMatches,
  checkoutTotalCents,
  feeAfterRefund,
  feeCreditAfterReturn,
  introUntilFromFirstPaid,
  itemRefundedCents,
  platformFeeBinds,
  returnedCents,
  sameDayPickupStart,
  serviceFeeRefunded,
  torontoInstant,
  scheduleForOverride,
  serviceFeeCents,
  shopperCancelAllowed,
  stallCheckoutBinds,
  stallExpireBinds,
  torontoDate,
  VENDOR_SALES_OPEN,
  type CheckoutDetails,
  type FeeOverride,
  type FeeSchedule,
} from "@/lib/selling";
import { capabilityFlags, CONNECT_PREVIEW_API_VERSION, getStripe, integrationIdentifier } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import { menuItemPhotoUrl, publishedMenuSelectMissingPhoto } from "@/lib/menu-item-photo-url";
import { sendOrderMail } from "@/lib/order-mail";
import { isAlcoholCategory } from "@/lib/product-hits";

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
  service_fee_cents: number;
  service_fee_refunded: boolean;
  commission_cents: number;
  commission_bps: number;
  flat_fee_cents: number;
  ready_at: string | null;
  pickup_starts_at: string | null;
};

function checkoutOrigin() {
  return checkoutSiteOrigin(SITE_URL);
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

  // The idempotency key retries the account this owner created. Ownership lives
  // on vendor_stripe_accounts, not on metadata the stall could edit.
  const account = await stripe.v2.core.accounts.create({
    display_name: input.displayName.slice(0, 200),
    contact_email: input.email,
    dashboard: "express",
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
    apiVersion: CONNECT_PREVIEW_API_VERSION,
  });
  const flags = capabilityFlags(account);
  const saved = await saveStallAccount(input.vendorId, account.id, input.userId, flags);
  if (saved.error) return { error: saved.error, accountId: null };
  return { error: null, accountId: account.id };
}

export async function createAccountSession(vendorId: string, userId: string) {
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return null;
  const { data } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id, owner_user_id")
    .eq("vendor_id", vendorId)
    .eq("owner_user_id", userId)
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

export async function createStallDashboardLink(vendorId: string, userId: string) {
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db) return { error: "Payments are not available yet." as const, url: null };
  const { data } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id, owner_user_id")
    .eq("vendor_id", vendorId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  const accountId = data?.stripe_account_id;
  if (typeof accountId !== "string") return { error: "Set up payments first." as const, url: null };
  try {
    const link = await stripe.accounts.createLoginLink(accountId);
    if (!link.url) return { error: "Could not open the stall dashboard." as const, url: null };
    return { error: null, url: link.url };
  } catch (err) {
    console.error("stall dashboard", err instanceof Error ? err.message : "stripe");
    return { error: "Could not open the stall dashboard." as const, url: null };
  }
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
  if (!data) return null;
  const order = data as OrderRow;
  order.service_fee_cents = Number(order.service_fee_cents ?? 0);
  order.service_fee_refunded = order.service_fee_refunded === true;
  order.commission_cents = Number(order.commission_cents ?? 0);
  order.commission_bps = Number(order.commission_bps ?? 400);
  order.flat_fee_cents = Number(order.flat_fee_cents ?? 0);
  order.ready_at = order.ready_at ?? null;
  order.pickup_starts_at = order.pickup_starts_at ?? null;
  return order;
}

async function syncFee(order: OrderRow, actualApplicationFeeCents?: number | null) {
  const db = service();
  if (!db) return;
  if (order.status === "pending" || order.status === "expired" || order.status === "reserved") return;
  const parts = feeAfterRefund({
    subtotalCents: order.charge_cents,
    refundedSubtotalCents: order.refunded_cents,
    schedule: {
      commissionBps: order.commission_bps,
      flatCents: order.flat_fee_cents,
    },
    serviceFeeCents: order.service_fee_cents,
    serviceFeeReturned: order.service_fee_refunded,
  });
  const expectedFee =
    (parts.voided ? 0 : parts.commissionCents) +
    (parts.flatCents === 25 ? 25 : 0) +
    (parts.voided ? 0 : parts.serviceFeeCents);
  const feeMismatch =
    !parts.voided &&
    typeof actualApplicationFeeCents === "number" &&
    actualApplicationFeeCents !== expectedFee;
  if (feeMismatch) {
    console.error("stall application fee mismatch", order.id, expectedFee, actualApplicationFeeCents);
  }
  const { data: existing } = await db
    .from("platform_fees")
    .select("earned_on")
    .eq("order_id", order.id)
    .maybeSingle();
  const earnedOn =
    typeof existing?.earned_on === "string" ? existing.earned_on : torontoDate();
  const recordedPercent = feeMismatch
    ? (actualApplicationFeeCents as number)
    : parts.voided
      ? 0
      : parts.commissionCents;
  const row = {
    vendor_id: order.vendor_id,
    order_id: order.id,
    percent_cents: recordedPercent,
    flat_cents: feeMismatch ? 0 : parts.flatCents === 25 ? 25 : 0,
    service_fee_cents: feeMismatch || parts.voided ? 0 : parts.serviceFeeCents,
    voided: parts.voided,
    collected_on_charge: true,
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
      order.charge_cents + order.service_fee_cents,
    )
  ) {
    console.error("stall checkout amount mismatch", session.id);
    return;
  }
  const actualFee = await applicationFeeOnCharge(session, stripeAccount);
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
  const wasUnpaid = order.status === "pending" || order.status === "expired";
  if (wasUnpaid || order.status === "paid") {
    const { data: updated, error } = await db
      .from("orders")
      .update({
        status: next,
        paid_at: order.paid_at ?? new Date().toISOString(),
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: intentId(session.payment_intent) ?? order.stripe_payment_intent_id,
        ...(buyerEmail && !order.buyer_email ? { buyer_email: buyerEmail } : {}),
      })
      .eq("id", order.id)
      .in("status", wasUnpaid ? ["pending", "expired"] : ["paid"])
      .select("id");
    if (error) throw new Error("stall checkout was not recorded");
    if (wasUnpaid && updated?.length) {
      const paid = await loadOrder(order.id);
      if (paid) {
        await syncFee(paid, actualFee);
        await stampIntroWindow(paid);
        await sendPaidOrderMail(paid);
      }
      const slug = await vendorSlug(order.vendor_id);
      refreshDirectoryLater([slug ? `/vendors/${slug}` : ""]);
      return;
    }
  }
  const fresh = await loadOrder(order.id);
  if (fresh) await syncFee(fresh, actualFee);
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

async function applicationFeeOnCharge(session: Stripe.Checkout.Session, stripeAccount: string | null) {
  const stripe = getStripe();
  const paymentIntent = intentId(session.payment_intent);
  if (!stripe || !paymentIntent) return null;
  const intent = await stripe.paymentIntents.retrieve(
    paymentIntent,
    {},
    stripeAccount ? { stripeAccount } : {},
  );
  return typeof intent.application_fee_amount === "number" ? intent.application_fee_amount : null;
}

async function applyReturnedAmount(order: OrderRow, returned: number, paymentIntent: string | null) {
  const db = service();
  if (!db) return;
  const itemRefunded = itemRefundedCents(order.charge_cents, order.service_fee_cents, returned);
  const refunded = returnedCents(order.charge_cents, order.refunded_cents, itemRefunded);
  const feeReturned = order.service_fee_refunded || serviceFeeRefunded(order.charge_cents, order.service_fee_cents, returned);
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
    service_fee_refunded: feeReturned,
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

function applicationFeeId(charge: Stripe.Charge) {
  if (!charge.application_fee) return null;
  return typeof charge.application_fee === "string" ? charge.application_fee : charge.application_fee.id;
}

async function refundRemainingApplicationFee(charge: Stripe.Charge, stripeAccount: string | null) {
  const stripe = getStripe();
  if (!stripe) return;
  let current = charge;
  if (!applicationFeeId(current)) {
    current = stripeAccount
      ? await stripe.charges.retrieve(charge.id, {}, { stripeAccount })
      : await stripe.charges.retrieve(charge.id);
  }
  const feeId = applicationFeeId(current);
  if (!feeId) return;
  try {
    const fee = await stripe.applicationFees.retrieve(feeId);
    const remaining = fee.amount - fee.amount_refunded;
    if (remaining <= 0) return;
    await stripe.applicationFees.createRefund(feeId, { amount: remaining });
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code?: string }).code) : "";
    if (code === "charge_already_refunded") return;
    console.error("application fee refund", err instanceof Error ? err.message : "stripe");
  }
}

async function applyChargeReturn(charge: Stripe.Charge, returned: number, stripeAccount: string | null) {
  if (returned <= 0) return;
  if (charge.currency?.toLowerCase() !== "cad") return;
  const order = await findOrderForCharge(charge, stripeAccount);
  if (order) {
    order.service_fee_cents = Number(order.service_fee_cents ?? 0);
    await applyReturnedAmount(order, returned, paymentIntentId(charge.payment_intent));
    if (serviceFeeRefunded(order.charge_cents, order.service_fee_cents, returned)) {
      await refundRemainingApplicationFee(charge, stripeAccount);
    }
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
  image_url: string | null;
  product_category: string | null;
  reserve: boolean;
};

async function feeScheduleFor(vendorId: string): Promise<FeeSchedule> {
  const db = service();
  if (!db) return scheduleForOverride(null);
  const { data } = await db
    .from("vendor_fee_overrides")
    .select("intro_bps, standard_bps, flat_cents, intro_until")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!data || typeof data.intro_bps !== "number" || typeof data.standard_bps !== "number") {
    return scheduleForOverride(null);
  }
  const override: FeeOverride = {
    introBps: data.intro_bps,
    standardBps: data.standard_bps,
    flatCents: typeof data.flat_cents === "number" ? data.flat_cents : 0,
    introUntil: typeof data.intro_until === "string" ? data.intro_until : null,
  };
  return scheduleForOverride(override);
}

async function stampIntroWindow(order: OrderRow) {
  const db = service();
  if (!db || !order.paid_at) return;
  await db
    .from("vendor_fee_overrides")
    .update({ intro_until: introUntilFromFirstPaid(new Date(order.paid_at)) })
    .eq("vendor_id", order.vendor_id)
    .is("intro_until", null);
}

async function pickupStartFor(vendorId: string, fulfillment: string) {
  if (fulfillment !== "pickup") return null;
  const db = service();
  if (!db) return null;
  const { data: links } = await db.from("market_vendors").select("market_id").eq("vendor_id", vendorId);
  const ids = (links ?? [])
    .map((row) => row.market_id)
    .filter((id): id is string => typeof id === "string");
  if (!ids.length) return null;
  const { data: sessions } = await db
    .from("market_schedules")
    .select("weekday, opens_at, season_start, season_end")
    .in("market_id", ids);
  return sameDayPickupStart(
    new Date(),
    (sessions ?? []).flatMap((row) => {
      if (typeof row.weekday !== "number" || typeof row.opens_at !== "string") return [];
      return [
        {
          weekday: row.weekday,
          opensAt: row.opens_at,
          seasonStart: typeof row.season_start === "string" ? row.season_start : null,
          seasonEnd: typeof row.season_end === "string" ? row.season_end : null,
        },
      ];
    }),
  );
}

async function orderMailContext(order: OrderRow) {
  const db = service();
  if (!db) return null;
  const { data: vendor } = await db
    .from("vendors")
    .select("name, slug, email")
    .eq("id", order.vendor_id)
    .maybeSingle();
  if (!vendor || typeof vendor.name !== "string" || typeof vendor.slug !== "string") return null;
  return {
    vendorName: vendor.name,
    vendorSlug: vendor.slug,
    stallEmail: typeof vendor.email === "string" ? vendor.email : null,
  };
}

async function sendPaidOrderMail(order: OrderRow) {
  const context = await orderMailContext(order);
  if (!context) return;
  await sendOrderMail({
    kind: "paid",
    order,
    ...context,
  });
}

async function sendReservedOrderMail(order: OrderRow) {
  const context = await orderMailContext(order);
  if (!context) return;
  await sendOrderMail({
    kind: "reserved",
    order,
    ...context,
  });
}

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
  const menuColumns =
    "id, vendor_id, name, price_cents, product_category, offer_delivery, offer_pickup, offer_preorder, offer_terms, can_buy";
  let itemResult = await db
    .from("published_menus")
    .select(`${menuColumns}, image_url`)
    .eq("id", itemId)
    .eq("vendor_id", vendor.id)
    .maybeSingle();
  if (itemResult.error && publishedMenuSelectMissingPhoto(itemResult.error)) {
    itemResult = await db
      .from("published_menus")
      .select(menuColumns)
      .eq("id", itemId)
      .eq("vendor_id", vendor.id)
      .maybeSingle();
  }
  const item = itemResult.data;
  if (!item?.can_buy || typeof item.price_cents !== "number") return null;
  const reserve = isAlcoholCategory(
    "product_category" in item && typeof item.product_category === "string" ? item.product_category : null,
  );
  const { data: account } = await db
    .from("vendor_stripe_accounts")
    .select("stripe_account_id, card_payments_active")
    .eq("vendor_id", vendor.id)
    .maybeSingle();
  if (!reserve && (!account?.card_payments_active || typeof account.stripe_account_id !== "string")) return null;
  return {
    id: item.id,
    vendor_id: vendor.id,
    name: item.name,
    price_cents: item.price_cents,
    offer_delivery: false,
    offer_pickup: item.offer_pickup,
    offer_preorder: item.offer_preorder,
    offer_terms: item.offer_terms,
    can_buy: true,
    vendor_name: vendor.name,
    vendor_slug: vendor.slug,
    stripe_account_id: typeof account?.stripe_account_id === "string" ? account.stripe_account_id : "",
    image_url: menuItemPhotoUrl(
      "image_url" in item ? item.image_url : null,
      item.id,
    ),
    product_category:
      "product_category" in item && typeof item.product_category === "string" ? item.product_category : null,
    reserve,
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
  if (!db) return { error: "Payments are not available yet." as const };
  if (input.sellable.reserve) return startReservation(input);
  if (!stripe) return { error: "Payments are not available yet." as const };
  const flags = await refreshStallCapabilities(input.sellable.vendor_id);
  if (!flags?.cardPaymentsActive) return { error: "This stall cannot take a card yet." as const };

  const { details, sellable, buyerId } = input;
  if (details.fulfillment === "delivery") return { error: "Delivery is not available." as const };
  const chargeCents = sellable.price_cents * details.quantity;
  const schedule = await feeScheduleFor(sellable.vendor_id);
  const serviceCents = serviceFeeCents(chargeCents);
  const feeCents = applicationFeeCents(chargeCents, schedule);
  const percentCents = Math.round((chargeCents * schedule.commissionBps) / 10_000);
  if (feeCents >= checkoutTotalCents(chargeCents)) {
    return { error: "That price is too small for a card payment." as const };
  }
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
      service_fee_cents: serviceCents,
      commission_cents: percentCents + schedule.flatCents,
      commission_bps: schedule.commissionBps,
      flat_fee_cents: schedule.flatCents,
      pickup_starts_at: await pickupStartFor(sellable.vendor_id, details.fulfillment),
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
          {
            quantity: 1,
            price_data: {
              currency: "cad",
              unit_amount: serviceCents,
              product_data: {
                name: "Service fee",
                description: "MarketRegular",
              },
            },
          },
        ],
        payment_intent_data: {
          application_fee_amount: feeCents,
        },
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

export async function startFeeCheckout(
  vendorId: string,
  balanceCents: number,
  email: string | null,
  sellerUserId: string,
) {
  void vendorId;
  void balanceCents;
  void email;
  void sellerUserId;
  return { error: "The stall fee is taken on each paid order." as const, url: null };
}

export async function confirmFeeCheckout(vendorId: string, sessionId: string) {
  const stripe = getStripe();
  if (!stripe) return;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.vendor_id !== vendorId) return;
  await recordPlatformFee(session, null);
}

async function startReservation(input: {
  sellable: Sellable;
  buyerId: string;
  email: string | null;
  details: CheckoutDetails;
}) {
  const db = service();
  if (!db) return { error: "Payments are not available yet." as const };
  const { details, sellable, buyerId } = input;
  if (details.fulfillment === "delivery") return { error: "Delivery is not available." as const };
  const { data: owner } = await db
    .from("vendors")
    .select("claimed_by")
    .eq("id", sellable.vendor_id)
    .maybeSingle();
  if (typeof owner?.claimed_by !== "string") {
    return { error: "This stall cannot take a reservation yet." as const };
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
      charge_cents: sellable.price_cents * details.quantity,
      fulfillment: details.fulfillment,
      fulfillment_note: details.note,
      terms_snapshot: sellable.offer_terms,
      buyer_email: input.email,
      status: "reserved",
      paid_at: new Date().toISOString(),
      service_fee_cents: 0,
      commission_cents: 0,
      commission_bps: 0,
      flat_fee_cents: 0,
      pickup_starts_at: await pickupStartFor(sellable.vendor_id, details.fulfillment),
    })
    .select("id")
    .single();
  if (error || !inserted) return { error: "Could not save that reservation." as const };
  const order = await loadOrder(inserted.id as string);
  if (order) await sendReservedOrderMail(order);
  const origin = await checkoutOrigin();
  return {
    error: null,
    url: `${origin}/vendors/${sellable.vendor_slug}/orders/${inserted.id}`,
    reserved: true as const,
  };
}

async function ownedOrder(vendorId: string, orderId: string, userId: string) {
  const db = service();
  if (!db) return null;
  const { data: vendor } = await db.from("vendors").select("claimed_by").eq("id", vendorId).maybeSingle();
  if (vendor?.claimed_by !== userId) return null;
  const order = await loadOrder(orderId);
  if (!order || order.vendor_id !== vendorId) return null;
  return order;
}

export async function markOrderReady(vendorId: string, orderId: string, userId: string) {
  const db = service();
  const order = await ownedOrder(vendorId, orderId, userId);
  if (!db || !order) return { error: "That order is not yours." as const };
  if (order.status !== "paid" && order.status !== "reserved") {
    return { error: "That order is not ready to hand over." as const };
  }
  if (!order.ready_at) {
    const readyAt = new Date().toISOString();
    const { error } = await db.from("orders").update({ ready_at: readyAt }).eq("id", order.id).is("ready_at", null);
    if (error) return { error: "Could not mark that order ready." as const };
    const fresh = await loadOrder(order.id);
    if (fresh?.buyer_email) {
      const context = await orderMailContext(fresh);
      if (context) await sendOrderMail({ kind: "ready", order: fresh, ...context });
    }
  }
  return { error: null };
}

export async function setOrderPickupStart(
  vendorId: string,
  orderId: string,
  userId: string,
  raw: string,
) {
  const db = service();
  const order = await ownedOrder(vendorId, orderId, userId);
  if (!db || !order) return { error: "That order is not yours." as const };
  const match = raw.trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  const starts = match ? torontoInstant(match[1], match[2]) : null;
  if (!starts) return { error: "That pickup time is not allowed." as const };
  const { error } = await db
    .from("orders")
    .update({ pickup_starts_at: starts })
    .eq("id", order.id);
  if (error) return { error: "Could not save the pickup time." as const };
  return { error: null };
}

async function ensurePaymentIntent(order: OrderRow) {
  if (order.stripe_payment_intent_id) return order;
  const stripe = getStripe();
  const db = service();
  if (!stripe || !db || !order.stripe_checkout_session_id) return order;
  const accountId = await stallAccountId(order.vendor_id);
  if (!accountId) return order;
  const session = await stripe.checkout.sessions.retrieve(
    order.stripe_checkout_session_id,
    {},
    { stripeAccount: accountId },
  );
  const paymentIntent = intentId(session.payment_intent);
  if (!paymentIntent) return order;
  await db.from("orders").update({ stripe_payment_intent_id: paymentIntent }).eq("id", order.id);
  return (await loadOrder(order.id)) ?? { ...order, stripe_payment_intent_id: paymentIntent };
}

async function sendCancelledOrderMail(order: OrderRow) {
  const context = await orderMailContext(order);
  if (!context) return;
  await sendOrderMail({ kind: "cancelled", order, ...context });
}

export async function cancelShopperOrder(orderId: string, buyerId: string) {
  const db = service();
  const loaded = await loadOrder(orderId);
  if (!db || !loaded || loaded.buyer_id !== buyerId) return { error: "That order is missing." as const };
  if (
    !shopperCancelAllowed({
      status: loaded.status,
      readyAt: loaded.ready_at,
      pickupStartsAt: loaded.pickup_starts_at,
    })
  ) {
    return { error: "This order can no longer be cancelled here." as const };
  }
  if (loaded.status === "reserved") {
    const { error } = await db
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", loaded.id)
      .eq("status", "reserved");
    if (error) return { error: "Could not cancel that reservation." as const };
    await sendCancelledOrderMail(loaded);
    return { error: null };
  }
  const order = await ensurePaymentIntent(loaded);
  const stripe = getStripe();
  const accountId = await stallAccountId(order.vendor_id);
  if (!stripe || !accountId || !order.stripe_payment_intent_id) {
    return { error: "That payment is not ready to refund." as const };
  }
  try {
    await stripe.refunds.create(
      {
        payment_intent: order.stripe_payment_intent_id,
        refund_application_fee: true,
      },
      { stripeAccount: accountId },
    );
  } catch (err) {
    console.error("stall cancel", err instanceof Error ? err.message : "stripe");
    return { error: "Could not refund that order." as const };
  }
  await applyReturnedAmount(
    order,
    order.charge_cents + order.service_fee_cents,
    order.stripe_payment_intent_id,
  );
  await sendCancelledOrderMail(order);
  return { error: null };
}
