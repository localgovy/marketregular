import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { safePath } from "../src/lib/auth-redirect.ts";
import { orderLetter } from "../src/lib/order-mail.ts";
import { isStallCheckoutPath, onboardingExemptPath } from "../src/lib/onboarding.ts";
import { reservesAtStall } from "../src/lib/product-hits.ts";
import { checkoutSiteOrigin, originFromHost } from "../src/lib/site-host.ts";
import { readStripeWebhook, thinEventSyncsAccount } from "../src/lib/stripe.ts";
import {
  formatTorontoStamp,
  applicationFeeCents,
  checkoutAmountMatches,
  checkoutTotalCents,
  commissionCents,
  platformFeeBinds,
  stallCheckoutBinds,
  stallExpireBinds,
  earliestUncoveredEarnedOn,
  feeAfterRefund,
  ledgerFee,
  feeCreditAfterReturn,
  feeBalanceCents,
  feeDueLabel,
  feeDueOn,
  itemRefundedCents,
  parseCheckoutDetails,
  returnedCents,
  saleReady,
  scheduleForOverride,
  serviceFeeCents,
  serviceFeeRefunded,
  applicationFeeRefundCents,
  canadianPhone,
  cardStatementDescriptor,
  cardStatementParts,
  chosenMarket,
  orderStatusLabel,
  shopperRefundWindowCopy,
  stallCardStatusCopy,
  torontoDateTimeLocal,
  futurePickupStart,
  shopperCancelAllowed,
  sameDayPickupStart,
  torontoInstant,
  VENDOR_SALES_OPEN,
  SERVICE_FEE_FALLBACK_CENTS,
} from "../src/lib/selling.ts";

test("listing an item for sale is open", () => {
  assert.equal(VENDOR_SALES_OPEN, true);
});

test("a new stall pays 4 percent of the item subtotal plus the shopper service fee", () => {
  assert.equal(serviceFeeCents(1499), 50);
  assert.equal(serviceFeeCents(1500), 99);
  assert.equal(commissionCents(1000), 40);
  assert.equal(applicationFeeCents(1000), 40 + 50);
  assert.equal(checkoutTotalCents(1000), 1050);
  assert.equal(commissionCents(50), 2);
  assert.equal(applicationFeeCents(50), 52);
  assert.equal(checkoutTotalCents(50), 100);
  assert.equal(SERVICE_FEE_FALLBACK_CENTS, 70);
  assert.notEqual(serviceFeeCents(50), SERVICE_FEE_FALLBACK_CENTS);
});

test("I'd Tap That keeps 3.5 percent plus 25 cents during year one", () => {
  const now = new Date("2026-11-12T15:00:00Z");
  const intro = scheduleForOverride(
    { introBps: 350, standardBps: 400, flatCents: 25, introUntil: null },
    now,
  );
  assert.equal(commissionCents(50, intro), 2 + 25);
  assert.equal(applicationFeeCents(50, intro), 77);
  const later = scheduleForOverride(
    { introBps: 350, standardBps: 400, flatCents: 25, introUntil: "2026-11-01T00:00:00Z" },
    now,
  );
  assert.equal(commissionCents(1000, later), 40 + 25);
});

test("a checkout counts when the cad subtotal matches the menu price", () => {
  assert.equal(checkoutAmountMatches("cad", 1000, 1000, 1000), true);
  assert.equal(checkoutAmountMatches("CAD", 1050, 1050, 1050), true);
  assert.equal(checkoutAmountMatches("cad", 1000, 1130, 1000), true);
  assert.equal(checkoutAmountMatches("cad", null, 1000, 1000), true);
  assert.equal(checkoutAmountMatches("usd", 1000, 1000, 1000), false);
  assert.equal(checkoutAmountMatches("cad", 900, 900, 1000), false);
  assert.equal(checkoutAmountMatches("cad", null, null, 1000), false);
});

test("a connected-account checkout cannot stand in for the session we stored", () => {
  const real = {
    storedSessionId: "cs_real",
    sessionId: "cs_real",
    eventAccount: "acct_stall",
    vendorAccount: "acct_stall",
  };
  assert.equal(stallCheckoutBinds(real), true);
  assert.equal(stallCheckoutBinds({ ...real, eventAccount: null }), true);
  assert.equal(stallCheckoutBinds({ ...real, sessionId: "cs_decoy" }), false);
  assert.equal(stallCheckoutBinds({ ...real, storedSessionId: null }), false);
  assert.equal(stallCheckoutBinds({ ...real, eventAccount: "acct_other" }), false);
  assert.equal(stallCheckoutBinds({ ...real, vendorAccount: null }), false);
  assert.equal(stallExpireBinds("cs_real", "cs_real"), true);
  assert.equal(stallExpireBinds("cs_real", "cs_decoy"), false);
  assert.equal(stallExpireBinds(null, "cs_decoy"), false);
});

test("a platform fee counts only for the session and amount we opened", () => {
  const paid = {
    eventAccount: null,
    currency: "cad",
    expectedVendorId: "vendor-1",
    expectedAmountCents: 850,
    sessionVendorId: "vendor-1",
    paidAmountCents: 850,
  };
  assert.equal(platformFeeBinds(paid), true);
  assert.equal(platformFeeBinds({ ...paid, currency: "CAD" }), true);
  assert.equal(platformFeeBinds({ ...paid, eventAccount: "acct_stall" }), false);
  assert.equal(platformFeeBinds({ ...paid, currency: "usd" }), false);
  assert.equal(platformFeeBinds({ ...paid, paidAmountCents: 50 }), false);
  assert.equal(platformFeeBinds({ ...paid, sessionVendorId: "vendor-2" }), false);
  assert.equal(platformFeeBinds({ ...paid, expectedVendorId: null, expectedAmountCents: null }), false);
});

test("a refund under the item price keeps the service fee", () => {
  const schedule = { commissionBps: 400, flatCents: 0 };
  assert.equal(itemRefundedCents(1000, 50, 400), 400);
  assert.equal(serviceFeeRefunded(1000, 50, 400), false);
  assert.deepEqual(
    feeAfterRefund({
      subtotalCents: 1000,
      refundedSubtotalCents: itemRefundedCents(1000, 50, 400),
      schedule,
      serviceFeeCents: 50,
      serviceFeeReturned: false,
    }),
    { commissionCents: 24, flatCents: 0, serviceFeeCents: 50, voided: false },
  );
});

test("a refund of the item price does not return the service fee", () => {
  const schedule = { commissionBps: 350, flatCents: 25 };
  assert.equal(itemRefundedCents(1000, 50, 1000), 1000);
  assert.equal(serviceFeeRefunded(1000, 50, 1000), false);
  assert.equal(itemRefundedCents(1000, 50, 1025), 1000);
  assert.equal(serviceFeeRefunded(1000, 50, 1025), false);
  assert.deepEqual(
    feeAfterRefund({
      subtotalCents: 1000,
      refundedSubtotalCents: 1000,
      schedule,
      serviceFeeCents: 50,
      serviceFeeReturned: false,
    }),
    { commissionCents: 0, flatCents: 0, serviceFeeCents: 50, voided: false },
  );
});

test("a refund of the whole checkout voids the commission and the service fee", () => {
  const schedule = { commissionBps: 400, flatCents: 0 };
  assert.equal(itemRefundedCents(1000, 50, 1050), 1000);
  assert.equal(serviceFeeRefunded(1000, 50, 1050), true);
  assert.deepEqual(
    feeAfterRefund({
      subtotalCents: 1000,
      refundedSubtotalCents: itemRefundedCents(1000, 50, 1050),
      schedule,
      serviceFeeCents: 50,
      serviceFeeReturned: true,
    }),
    { commissionCents: 0, flatCents: 0, serviceFeeCents: 0, voided: true },
  );
  assert.equal(returnedCents(1000, 400, 200), 400);
  assert.equal(returnedCents(1000, 200, 1500), 1000);
});

test("a smaller fee refund does not restore credit", () => {
  assert.deepEqual(feeCreditAfterReturn(1000, 1000, 100), { action: "lower", amountCents: 900 });
  assert.deepEqual(feeCreditAfterReturn(500, 1000, 100), { action: "keep" });
  assert.deepEqual(feeCreditAfterReturn(1000, 1000, 1000), { action: "drop" });
  assert.deepEqual(feeCreditAfterReturn(1000, 1000, 960), { action: "lower", amountCents: 40 });
  assert.deepEqual(feeCreditAfterReturn(40, 1000, 960), { action: "keep" });
});

test("the ledger keeps a flat fee that is not 25 cents", () => {
  const parts = feeAfterRefund({
    subtotalCents: 2000,
    refundedSubtotalCents: 0,
    schedule: { commissionBps: 400, flatCents: 40 },
    serviceFeeCents: 99,
  });
  assert.deepEqual(ledgerFee(parts), {
    percentCents: 80,
    flatCents: 40,
    serviceFeeCents: 99,
    voided: false,
  });
  assert.deepEqual(ledgerFee(parts, 219), {
    percentCents: 80,
    flatCents: 40,
    serviceFeeCents: 99,
    voided: false,
  });
  assert.deepEqual(ledgerFee(parts, 100), {
    percentCents: 100,
    flatCents: 0,
    serviceFeeCents: 0,
    voided: false,
  });
});

test("a partial refund keeps the flat amount until the item is fully refunded", () => {
  const schedule = { commissionBps: 350, flatCents: 25 };
  assert.deepEqual(
    feeAfterRefund({
      subtotalCents: 1000,
      refundedSubtotalCents: 0,
      schedule,
      serviceFeeCents: 50,
    }),
    { commissionCents: 35, flatCents: 25, serviceFeeCents: 50, voided: false },
  );
  assert.deepEqual(
    feeAfterRefund({
      subtotalCents: 1000,
      refundedSubtotalCents: 1000,
      schedule,
      serviceFeeCents: 50,
      serviceFeeReturned: true,
    }),
    { commissionCents: 0, flatCents: 0, serviceFeeCents: 0, voided: true },
  );
});

test("payments cover the oldest fees first and the rest is due 31 December", () => {
  const fees = [
    { earnedOn: "2026-03-02", commissionCents: 35, flatCents: 25, serviceFeeCents: 0, voided: false },
    { earnedOn: "2026-11-01", commissionCents: 10, flatCents: 25, serviceFeeCents: 0, voided: false },
  ];
  assert.equal(feeBalanceCents(fees, []), 95);
  assert.equal(feeBalanceCents(fees, [95]), 0);
  assert.equal(feeBalanceCents(fees, [120]), -25);
  assert.equal(earliestUncoveredEarnedOn(fees, 0), "2026-03-02");
  assert.equal(earliestUncoveredEarnedOn(fees, 60), "2026-11-01");
  assert.equal(earliestUncoveredEarnedOn(fees, 95), null);
  assert.equal(feeDueOn("2026-03-02"), "2026-12-31");
  assert.equal(feeDueLabel("2026-12-31"), "31 December 2026");
  assert.equal(feeDueLabel("2026-03-02"), null);
});

test("checkout details are pickup or preorder", () => {
  const offers = { delivery: true, pickup: true, preorder: false };
  assert.equal(
    parseCheckoutDetails({
      fulfillment: "delivery",
      quantity: "1",
      note: "Leave it",
      pickupName: "Ada",
      deliveryName: "Ada",
      line1: "1 Market St",
      city: "Toronto",
      region: "ON",
      postal: "M5V 2T6",
      offers,
    }).error,
    "Delivery is not available.",
  );
  const pickup = parseCheckoutDetails({
    fulfillment: "pickup",
    quantity: "2",
    note: "Saturday morning",
    pickupName: "Ada",
    deliveryName: "",
    line1: "",
    city: "",
    region: "",
    postal: "",
    offers,
  });
  assert.equal(pickup.error, null);
  if (pickup.error) return;
  assert.equal(pickup.details.quantity, 2);
  assert.equal(pickup.details.note, "Saturday morning");
  assert.equal(pickup.details.pickupName, "Ada");
  assert.equal(pickup.details.delivery, null);

  const missingName = parseCheckoutDetails({
    fulfillment: "pickup",
    quantity: "1",
    note: "",
    pickupName: " ",
    deliveryName: "",
    line1: "",
    city: "",
    region: "",
    postal: "",
    offers,
  });
  assert.equal(missingName.error, "Add your name.");

  const missingNote = parseCheckoutDetails({
    fulfillment: "preorder",
    quantity: "1",
    note: "",
    pickupName: "Ada",
    deliveryName: "",
    line1: "",
    city: "",
    region: "",
    postal: "",
    offers,
  });
  assert.equal(missingNote.error, "This item is not offered for preorder.");

  const badPostal =     parseCheckoutDetails({
      fulfillment: "delivery",
      quantity: "1",
      note: "",
      pickupName: "",
      deliveryName: "Ada",
    line1: "1 Market St",
    city: "Toronto",
    region: "ON",
    postal: "12345",
    offers,
  });
  assert.equal(badPostal.error, "Delivery is not available.");
  assert.equal(
    saleReady({ forSale: true, priceCents: 40, offers }),
    "A sale needs a price of at least $0.50.",
  );
  assert.equal(saleReady({ forSale: false, priceCents: null, offers }), null);
});

test("checkout stays on this host and does not require the shopper profile", () => {
  assert.equal(
    originFromHost("localhost:3000", "https", "https://www.marketregular.com"),
    "http://localhost:3000",
  );
  assert.equal(
    originFromHost("www.marketregular.com", "https", "https://www.marketregular.com"),
    "https://www.marketregular.com",
  );
  assert.equal(
    originFromHost("evil-marketregular.com", "https", "https://www.marketregular.com"),
    "https://www.marketregular.com",
  );
  assert.equal(
    originFromHost("www.marketregular.com:443@evil.example", "https", "https://www.marketregular.com"),
    "https://www.marketregular.com",
  );
  assert.equal(
    originFromHost("www.marketregular.com", "https://evil.example", "https://www.marketregular.com"),
    "https://www.marketregular.com",
  );
  assert.equal(
    originFromHost("www.marketregular.com", "http", "https://www.marketregular.com"),
    "https://www.marketregular.com",
  );
  assert.equal(onboardingExemptPath("/vendors/river-fruit/buy/11111111-1111-4111-8111-111111111111"), true);
  assert.equal(onboardingExemptPath("/vendors/river-fruit/orders/11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isStallCheckoutPath("/account"), false);
  assert.equal(onboardingExemptPath("/account"), false);
});

test("checkout returns use the public site, not the request host", () => {
  const site = "https://www.marketregular.com";
  assert.equal(shopperCancelAllowed({ status: "paid", readyAt: null, pickupStartsAt: "2026-11-12T19:00:00Z", now: new Date("2026-11-12T15:00:00Z") }), true);
  assert.equal(shopperCancelAllowed({ status: "partially_refunded", readyAt: null, pickupStartsAt: null, now: new Date("2026-11-12T15:00:00Z") }), true);
  assert.equal(shopperCancelAllowed({ status: "refund_pending", readyAt: null, pickupStartsAt: null }), false);
  assert.equal(
    sameDayPickupStart(new Date("2026-11-12T15:00:00Z"), [
      { weekday: 4, opensAt: "08:00", seasonStart: null, seasonEnd: null },
    ]),
    null,
  );
  assert.equal(shopperCancelAllowed({ status: "paid", readyAt: "2026-11-12T14:00:00Z", pickupStartsAt: "2026-11-12T19:00:00Z", now: new Date("2026-11-12T15:00:00Z") }), true);
  assert.equal(shopperCancelAllowed({ status: "paid", readyAt: "2026-11-12T14:00:00Z", pickupStartsAt: "2026-11-12T19:00:00Z", now: new Date("2026-11-12T20:00:00Z") }), false);
  assert.equal(shopperCancelAllowed({ status: "paid", readyAt: "2026-11-12T14:00:00Z", pickupStartsAt: null, now: new Date("2026-11-12T20:00:00Z") }), true);
  assert.equal(
    shopperCancelAllowed({
      status: "paid",
      readyAt: null,
      pickupStartsAt: null,
      disputedAt: "2026-11-12T14:00:00Z",
    }),
    false,
  );
  assert.equal(canadianPhone("(416) 555-0199"), "+14165550199");
  assert.equal(canadianPhone("1 416 555 0199"), "+14165550199");
  assert.equal(canadianPhone("555"), null);
  assert.equal(cardStatementDescriptor("River Fruit"), "River Fruit");
  assert.equal(cardStatementDescriptor("I'd Tap That"), "Id Tap That");
  assert.equal(cardStatementDescriptor("Pie"), null);
  assert.equal(cardStatementDescriptor("12345"), null);
  assert.deepEqual(cardStatementParts("River Fruit"), {
    descriptor: "River",
    prefix: "River",
    suffix: "Fruit",
  });
  assert.deepEqual(cardStatementParts("Wychwood Barns Pie Co"), {
    descriptor: "Wychwood",
    prefix: "Wychwood",
    suffix: "Barns Pie Co",
  });
  assert.equal(cardStatementParts("Pie"), null);
  assert.equal(cardStatementParts("River")?.suffix, null);
  assert.equal(orderStatusLabel("reserved", "2026-11-12T14:00:00.000Z"), "Ready for pickup");
  assert.equal(orderStatusLabel("reserved", null), "Reserved");
  assert.equal(torontoDateTimeLocal("2026-11-12T14:00:00.000Z"), "2026-11-12T09:00");
  assert.equal(
    shopperRefundWindowCopy({
      status: "paid",
      readyAt: "2026-11-12T14:00:00Z",
      pickupStartsAt: "2026-11-12T19:00:00Z",
      now: new Date("2026-11-12T20:00:00Z"),
    }),
    "A refund from here is closed.",
  );
  assert.equal(
    stallCardStatusCopy({
      published: false,
      cardPaymentsActive: true,
      menus: [],
    }),
    "Card payments are on. Buyers can pay once this stall is published and an item is offered for sale.",
  );
  assert.equal(
    stallCardStatusCopy({
      published: true,
      cardPaymentsActive: false,
      menus: [{ forSale: true, priceCents: 800, pickup: true, preorder: false, alcohol: true }],
    }),
    "Finish the payment setup before a Buy button can show. Alcohol can still be reserved.",
  );
  assert.equal(chosenMarket([{ id: "m1", name: "Wychwood" }], "").name, "Wychwood");
  assert.equal(chosenMarket([{ id: "m1", name: "Wychwood" }, { id: "m2", name: "Evergreen" }], "").error, "Pick a market.");
  assert.equal(safePath("/vendors/river/orders/abc?session_id=cs_test_123"), "/vendors/river/orders/abc?session_id=cs_test_123");
  assert.equal(reservesAtStall("alcohol"), true);
  assert.equal(reservesAtStall("bread-and-bakery", true), false);
  assert.equal(reservesAtStall("bread-and-bakery"), false);
  const now = new Date("2026-11-12T15:00:00Z");
  assert.equal(futurePickupStart("2026-11-12T09:00", now, null).error, "Pick a pickup time that has not started.");
  assert.equal(futurePickupStart("2026-11-12T12:00", now, "2026-11-12T18:00:00.000Z").error, "That pickup time is earlier than the one already set.");
  assert.equal(futurePickupStart("2026-11-12T16:00", now, "2026-11-12T18:00:00.000Z").starts, "2026-11-12T21:00:00.000Z");
  const schedule = { commissionBps: 400, flatCents: 25 };
  assert.equal(
    applicationFeeRefundCents({
      applicationFeeCents: 115,
      alreadyRefundedCents: 0,
      subtotalCents: 1000,
      refundedSubtotalCents: 1000,
      schedule,
      serviceFeeCents: 50,
      serviceFeeReturned: true,
    }),
    115,
  );
  assert.equal(
    applicationFeeRefundCents({
      applicationFeeCents: 115,
      alreadyRefundedCents: 0,
      subtotalCents: 1000,
      refundedSubtotalCents: 500,
      schedule,
      serviceFeeCents: 50,
      serviceFeeReturned: false,
    }),
    20,
  );
  const ready = orderLetter(
    {
      kind: "ready",
      order: {
        id: "11111111-1111-4111-8111-111111111111",
        item_name: "Rye",
        quantity: 1,
        charge_cents: 800,
        service_fee_cents: 50,
        fulfillment: "pickup",
        buyer_email: "buyer@example.com",
        status: "paid",
      },
      vendorName: "River Fruit",
      vendorSlug: "river-fruit",
      stallEmail: null,
    },
    "shopper",
  );
  assert.match(ready.text, /plus \$0\.50 service fee/);
  const reservedReady = orderLetter(
    {
      kind: "ready",
      order: {
        id: "11111111-1111-4111-8111-111111111111",
        item_name: "Cider",
        quantity: 1,
        charge_cents: 1200,
        service_fee_cents: 0,
        fulfillment: "pickup",
        buyer_email: "buyer@example.com",
        status: "reserved",
      },
      vendorName: "River Fruit",
      vendorSlug: "river-fruit",
      stallEmail: null,
    },
    "shopper",
  );
  assert.match(reservedReady.text, /Pay at the stall and show ID/);
  assert.equal(torontoInstant("2026-11-12", "09:00"), "2026-11-12T14:00:00.000Z");
  assert.equal(checkoutSiteOrigin(site), site);
  assert.notEqual(
    checkoutSiteOrigin(site),
    originFromHost("preview.marketregular.com", "https", site),
  );
});

test("a thin capability notice names the stall account after the signature matches", () => {
  assert.equal(
    thinEventSyncsAccount("v2.core.account[configuration.merchant].capability_status_updated"),
    true,
  );
  assert.equal(thinEventSyncsAccount("checkout.session.completed"), false);
  const secret = "whsec_test_secret";
  const previous = process.env.STRIPE_WEBHOOK_SECRET;
  const previousConnect = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "";
  try {
    const stripe = new Stripe("sk_test_123");
    const payload = JSON.stringify({
      id: "evt_thin",
      object: "v2.core.event",
      type: "v2.core.account[configuration.merchant].capability_status_updated",
      livemode: false,
      related_object: { id: "acct_stall", type: "v2.core.account" },
    });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const delivery = readStripeWebhook(stripe, payload, signature);
    assert.equal(delivery?.kind, "thin");
    if (delivery?.kind !== "thin") return;
    assert.equal(delivery.accountId, "acct_stall");
    assert.equal(delivery.livemode, false);
    assert.throws(() => readStripeWebhook(stripe, payload, "t=1,v1=dead"));
    const stamp = formatTorontoStamp("2026-11-18T16:00:00.000Z");
    assert.ok(stamp);
    const paid = orderLetter(
      {
        kind: "paid",
        order: {
          id: "11111111-1111-4111-8111-111111111111",
          item_name: "Rye",
          quantity: 1,
          charge_cents: 800,
          service_fee_cents: 50,
          fulfillment: "pickup",
          buyer_email: "buyer@example.com",
          pickup_name: "Ada",
          market_name: "YUM! Market",
          pickup_starts_at: "2026-11-18T16:00:00.000Z",
        },
        vendorName: "River Fruit",
        vendorSlug: "river-fruit",
        stallEmail: null,
      },
      "shopper",
    );
    assert.match(paid.text, new RegExp(stamp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(paid.text, /Ada/);
    const moved = orderLetter(
      {
        kind: "pickup",
        order: {
          id: "11111111-1111-4111-8111-111111111111",
          item_name: "Rye",
          quantity: 1,
          charge_cents: 800,
          service_fee_cents: 50,
          fulfillment: "pickup",
          buyer_email: "buyer@example.com",
          pickup_starts_at: "2026-11-18T16:00:00.000Z",
        },
        vendorName: "River Fruit",
        vendorSlug: "river-fruit",
        stallEmail: "stall@example.com",
      },
      "shopper",
    );
    assert.equal(moved.subject, "Pickup time for Rye");
    assert.match(moved.text, /Pickup for Rye at River Fruit is/);
  } finally {
    if (previous === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previous;
    if (previousConnect === undefined) delete process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
    else process.env.STRIPE_CONNECT_WEBHOOK_SECRET = previousConnect;
  }
});
