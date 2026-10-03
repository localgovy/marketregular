import "server-only";

import { randomInt } from "node:crypto";
import Stripe from "stripe";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

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

export function constructWebhookEvent(stripe: Stripe, body: string, signature: string) {
  const secrets = stripeWebhookSecrets();
  if (!secrets.length) return null;
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(body, signature, secret);
    } catch (error) {
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
