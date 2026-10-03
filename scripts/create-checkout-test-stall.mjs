import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { readFileSync } from "node:fs";

function envFromFile() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    env[line.slice(0, index)] = line.slice(index + 1).trim().replace(/^"|"$/g, "");
  }
  return env;
}

const env = envFromFile();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const ownerEmail = "checkout-test-owner@example.com";
const buyerEmail = "checkout-test-buyer@example.com";
const password = "Checkout-Test-2026";
const slug = "checkout-test-stall";
const marketId = "00000000-0000-0000-0000-000000000031";

async function ensureUser(email) {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;
  const found = listed.users.find((user) => user.email === email);
  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return found.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

const ownerId = await ensureUser(ownerEmail);
const buyerId = await ensureUser(buyerEmail);

const { data: existing } = await supabase.from("vendors").select("id").eq("slug", slug).maybeSingle();
let vendorId = existing?.id;
if (!vendorId) {
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      slug,
      name: "Checkout Test Stall",
      about: "A test stall for checkout. Not a real vendor.",
      tags: ["produce"],
      status: "published",
      claimed_by: ownerId,
      selling_approved: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  vendorId = data.id;
} else {
  const { error } = await supabase
    .from("vendors")
    .update({
      status: "published",
      claimed_by: ownerId,
      selling_approved: true,
      name: "Checkout Test Stall",
    })
    .eq("id", vendorId);
  if (error) throw error;
}

const { error: stallError } = await supabase.from("market_vendors").upsert(
  {
    market_id: marketId,
    vendor_id: vendorId,
    stall: "Test",
    days: [3],
  },
  { onConflict: "market_id,vendor_id" },
);
if (stallError) throw stallError;

const { data: menu } = await supabase
  .from("vendor_menus")
  .select("id")
  .eq("vendor_id", vendorId)
  .eq("name", "Test peaches")
  .maybeSingle();
let itemId = menu?.id;
if (!itemId) {
  const { data, error } = await supabase
    .from("vendor_menus")
    .insert({
      vendor_id: vendorId,
      name: "Test peaches",
      description: "A basket for the checkout test.",
      price_cents: 1000,
      for_sale: true,
      offer_pickup: true,
      offer_delivery: true,
      offer_preorder: true,
      offer_terms: "Pay now. Pick up at the stall, or we deliver in Toronto. This is a test item.",
    })
    .select("id")
    .single();
  if (error) throw error;
  itemId = data.id;
} else {
  const { error } = await supabase
    .from("vendor_menus")
    .update({
      price_cents: 1000,
      for_sale: true,
      offer_pickup: true,
      offer_delivery: true,
      offer_preorder: true,
      offer_terms: "Pay now. Pick up at the stall, or we deliver in Toronto. This is a test item.",
    })
    .eq("id", itemId);
  if (error) throw error;
}

const { data: linked } = await supabase
  .from("vendor_stripe_accounts")
  .select("stripe_account_id")
  .eq("vendor_id", vendorId)
  .maybeSingle();

let accountId = linked?.stripe_account_id;
if (!accountId) {
  const account = await stripe.v2.core.accounts.create({
    display_name: "Checkout Test Stall",
    contact_email: ownerEmail,
    dashboard: "full",
    identity: { country: "ca" },
    configuration: {
      merchant: { capabilities: { card_payments: { requested: true } } },
    },
    defaults: {
      currency: "cad",
      locales: ["en-CA"],
      responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
    },
    metadata: { vendor_id: vendorId },
    include: ["configuration.merchant", "requirements"],
  });
  accountId = account.id;
  const { error } = await supabase.from("vendor_stripe_accounts").insert({
    vendor_id: vendorId,
    stripe_account_id: accountId,
    card_payments_active: false,
    payouts_active: false,
  });
  if (error) throw error;
}

const updated = await stripe.accounts.update(accountId, {
  business_type: "individual",
  business_profile: {
    mcc: "5499",
    product_description: "Test peaches sold at a farmers market stall.",
    url: "https://www.marketregular.com",
  },
  individual: {
    first_name: "Test",
    last_name: "Stall",
    email: ownerEmail,
    phone: "0000000000",
    dob: { day: 1, month: 1, year: 1990 },
    address: {
      line1: "address_full_match",
      city: "Toronto",
      state: "ON",
      postal_code: "M5V2T6",
      country: "CA",
    },
    id_number: "000000000",
  },
  tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: "127.0.0.1" },
  external_account: {
    object: "bank_account",
    country: "CA",
    currency: "cad",
    routing_number: "11000-000",
    account_number: "000123456789",
  },
});

const v2 = await stripe.v2.core.accounts.retrieve(accountId, {
  include: ["configuration.merchant", "requirements"],
});
const card = v2.configuration?.merchant?.capabilities?.card_payments?.status === "active";
const payouts = v2.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status === "active";
await supabase
  .from("vendor_stripe_accounts")
  .update({ card_payments_active: card, payouts_active: payouts })
  .eq("vendor_id", vendorId);

const { data: buy } = await supabase
  .from("published_menus")
  .select("can_buy, price_cents")
  .eq("id", itemId)
  .maybeSingle();

console.log(
  JSON.stringify(
    {
      vendorId,
      itemId,
      ownerId,
      buyerId,
      accountId,
      chargesEnabled: updated.charges_enabled,
      cardPayments: v2.configuration?.merchant?.capabilities?.card_payments?.status,
      payouts: v2.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status,
      currentlyDue: updated.requirements?.currently_due,
      canBuy: buy?.can_buy,
    },
    null,
    2,
  ),
);
