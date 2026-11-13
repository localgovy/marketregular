import "server-only";

import { randomInt } from "node:crypto";
import Stripe from "stripe";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

/** Express accounts with Stripe-managed negative balances need this preview version. */
export const CONNECT_PREVIEW_API_VERSION = "2026-10-28.preview";

let client: Stripe | null = null;

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

export function stripePublishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
}

export function stripeWebhookSecrets() {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET]
    .map((value) => value?.trim() || "")
    .filter(Boolean);
  return [...new Set(secrets)];
}

export function stripeChargesConfigured() {
  return Boolean(stripeSecretKey());
}

export function stripeConnectConfigured() {
  return Boolean(stripeSecretKey() && stripePublishableKey());
}

export function getStripe() {
  const key = stripeSecretKey();
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

export function stripeEventModeMatches(livemode: boolean) {
  const key = stripeSecretKey();
  const live = key.startsWith("sk_live") || key.startsWith("rk_live");
  const test = key.startsWith("sk_test") || key.startsWith("rk_test");
  if (!live && !test) return false;
  return livemode === live;
}

/** Checkout hops only. Success and cancel URLs are built by this app. */
export function stripeCheckoutRedirect(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && parsed.hostname === "checkout.stripe.com") return parsed.href;
  } catch {
    return null;
  }
  return null;
}

export type StripeWebhookDelivery =
  | { kind: "snapshot"; event: Stripe.Event }
  | { kind: "thin"; livemode: boolean; type: string; accountId: string | null };

/** Capability changes on an Accounts v2 stall arrive as thin events on the platform endpoint. */
export function thinEventSyncsAccount(type: string) {
  return (
    type === "v2.core.account[configuration.merchant].capability_status_updated" ||
    type === "v2.core.account[configuration.merchant].updated" ||
    type === "v2.core.account.updated" ||
    type === "v2.core.account.closed"
  );
}

function thinDelivery(body: string): StripeWebhookDelivery {
  const parsed = JSON.parse(body) as {
    type?: unknown;
    livemode?: unknown;
    related_object?: { id?: unknown };
  };
  return {
    kind: "thin",
    livemode: parsed.livemode === true,
    type: typeof parsed.type === "string" ? parsed.type : "",
    accountId: typeof parsed.related_object?.id === "string" ? parsed.related_object.id : null,
  };
}

export function readStripeWebhook(
  stripe: Stripe,
  body: string,
  signature: string,
): StripeWebhookDelivery | null {
  const secrets = stripeWebhookSecrets();
  if (!secrets.length) return null;
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return { kind: "snapshot", event: stripe.webhooks.constructEvent(body, signature, secret) };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      // Signature already matched. Snapshot parsing rejects a v2 thin notification.
      if (message.includes("thin event")) return thinDelivery(body);
      lastError = error;
    }
  }
  throw lastError;
}

export function integrationIdentifier(flow: "stall_checkout" | "stall_fee") {
  let suffix = "";
  for (let i = 0; i < 8; i += 1) suffix += LETTERS[randomInt(26)];
  return `marketregular_${flow}_${suffix}`;
}

export function capabilityFlags(account: Stripe.V2.Core.Account) {
  const merchant = account.configuration?.merchant;
  return {
    cardPaymentsActive: merchant?.capabilities?.card_payments?.status === "active",
    payoutsActive: merchant?.capabilities?.stripe_balance?.payouts?.status === "active",
  };
}
