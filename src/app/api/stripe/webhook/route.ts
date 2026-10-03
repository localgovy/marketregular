import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applyLostDispute,
  applyStallRefund,
  expireStallCheckout,
  recordPlatformFee,
  recordStallCheckout,
  syncAccountEvent,
} from "@/lib/stall-payments";
import { constructWebhookEvent, getStripe, stripeWebhookSecrets } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe || stripeWebhookSecrets().length === 0) {
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const body = await request.text();
  let event: Stripe.Event;
  try {
    const constructed = constructWebhookEvent(stripe, body, signature);
    if (!constructed) return NextResponse.json({ error: "Not configured." }, { status: 500 });
    event = constructed;
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
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
      case "charge.dispute.closed":
        await applyLostDispute(event.data.object as Stripe.Dispute, event.account ?? null);
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
