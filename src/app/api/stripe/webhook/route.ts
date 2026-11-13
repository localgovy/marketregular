import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applyClosedDispute,
  applyOpenDispute,
  applyRefundUpdate,
  applyStallRefund,
  expireStallCheckout,
  recordPlatformFee,
  recordStallCheckout,
  syncAccountEvent,
} from "@/lib/stall-payments";
import {
  getStripe,
  readStripeWebhook,
  stripeEventModeMatches,
  stripeWebhookSecrets,
  thinEventSyncsAccount,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || stripeWebhookSecrets().length === 0) {
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const body = await request.text();
  let delivery;
  try {
    delivery = readStripeWebhook(stripe, body, signature);
    if (!delivery) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  if (delivery.kind === "thin") {
    if (!stripeEventModeMatches(delivery.livemode)) return NextResponse.json({ received: true });
    if (delivery.accountId && thinEventSyncsAccount(delivery.type)) {
      try {
        await syncAccountEvent(delivery.accountId);
      } catch (err) {
        console.error("stripe webhook", delivery.type, err instanceof Error ? err.message : "failed");
        return NextResponse.json({ error: "Could not record that event." }, { status: 500 });
      }
    }
    return NextResponse.json({ received: true });
  }
  const event = delivery.event;
  if (!stripeEventModeMatches(event.livemode)) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const account = event.account ?? null;
        await recordStallCheckout(session, account);
        await recordPlatformFee(session, account);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await expireStallCheckout(event.data.object as Stripe.Checkout.Session);
        break;
      case "charge.refunded":
        await applyStallRefund(event.data.object as Stripe.Charge, event.account ?? null);
        break;
      case "charge.refund.updated":
        await applyRefundUpdate(event.data.object as Stripe.Refund, event.account ?? null);
        break;
      case "charge.dispute.created":
      case "charge.dispute.funds_withdrawn":
        await applyOpenDispute(event.data.object as Stripe.Dispute, event.account ?? null);
        break;
      case "capability.updated": {
        const capability = event.data.object as Stripe.Capability;
        const accountId =
          event.account ||
          (typeof capability.account === "string" ? capability.account : capability.account.id);
        if (accountId) await syncAccountEvent(accountId);
        break;
      }
      case "charge.dispute.closed":
        await applyClosedDispute(event.data.object as Stripe.Dispute, event.account ?? null);
        break;
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const accountId = event.account || account.id;
        if (accountId) await syncAccountEvent(accountId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook", event.type, err instanceof Error ? err.message : "failed");
    return NextResponse.json({ error: "Could not record that event." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
