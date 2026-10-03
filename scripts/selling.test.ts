import assert from "node:assert/strict";
import { test } from "node:test";
import { isStallCheckoutPath, onboardingExemptPath } from "../src/lib/onboarding.ts";
import { originFromHost } from "../src/lib/site-host.ts";
import {
  checkoutAmountMatches,
  checkoutFeeCents,
  earliestUncoveredEarnedOn,
  feeAfterRefund,
  feeBalanceCents,
  feeDueLabel,
  feeDueOn,
  parseCheckoutDetails,
  percentFeeCents,
  returnedCents,
  saleReady,
  VENDOR_SALES_OPEN,
} from "../src/lib/selling.ts";

test("listing an item for sale stays closed", () => {
  assert.equal(VENDOR_SALES_OPEN, false);
});

test("a checkout fee is 3.5 percent plus 25 cents", () => {
  assert.equal(percentFeeCents(1000), 35);
  assert.equal(checkoutFeeCents(1000), 60);
  assert.equal(checkoutFeeCents(50), 27);
  assert.equal(percentFeeCents(1), 0);
  assert.equal(checkoutFeeCents(333), 12 + 25);
});

test("a checkout counts when the cad subtotal matches the menu price", () => {
  assert.equal(checkoutAmountMatches("cad", 1000, 1000, 1000), true);
  assert.equal(checkoutAmountMatches("cad", 1000, 1130, 1000), true);
  assert.equal(checkoutAmountMatches("cad", null, 1000, 1000), true);
  assert.equal(checkoutAmountMatches("usd", 1000, 1000, 1000), false);
  assert.equal(checkoutAmountMatches("cad", 900, 900, 1000), false);
  assert.equal(checkoutAmountMatches("cad", null, null, 1000), false);
});

test("a reversal the size of the charge voids the fee and a smaller one keeps the 25 cents", () => {
  assert.equal(returnedCents(1000, 0, 1000), 1000);
  assert.deepEqual(feeAfterRefund(1000, returnedCents(1000, 0, 1000)), {
    percentCents: 0,
    flatCents: 0,
    voided: true,
  });
  assert.equal(returnedCents(1000, 0, 400), 400);
  assert.deepEqual(feeAfterRefund(1000, returnedCents(1000, 0, 400)), {
    percentCents: 21,
    flatCents: 25,
    voided: false,
  });
  assert.equal(returnedCents(1000, 400, 200), 400);
  assert.equal(returnedCents(1000, 200, 1500), 1000);
});

test("a full refund voids the fee and a partial refund keeps the 25 cents", () => {
  assert.deepEqual(feeAfterRefund(1000, 1000), {
    percentCents: 0,
    flatCents: 0,
    voided: true,
  });
  assert.deepEqual(feeAfterRefund(1000, 400), {
    percentCents: 21,
    flatCents: 25,
    voided: false,
  });
  assert.deepEqual(feeAfterRefund(1000, 0), {
    percentCents: 35,
    flatCents: 25,
    voided: false,
  });
});

test("payments cover the oldest fees first and the rest is due 31 December", () => {
  const fees = [
    { earnedOn: "2026-03-02", percentCents: 35, flatCents: 25, voided: false },
    { earnedOn: "2026-11-01", percentCents: 10, flatCents: 25, voided: false },
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

test("checkout details follow the methods the stall turned on", () => {
  const offers = { delivery: true, pickup: true, preorder: false };
  const pickup = parseCheckoutDetails({
    fulfillment: "pickup",
    quantity: "2",
    note: "Saturday morning",
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
  assert.equal(pickup.details.delivery, null);

  const missingNote = parseCheckoutDetails({
    fulfillment: "preorder",
    quantity: "1",
    note: "",
    deliveryName: "",
    line1: "",
    city: "",
    region: "",
    postal: "",
    offers,
  });
  assert.equal(missingNote.error, "This item is not offered for preorder.");

  const delivery = parseCheckoutDetails({
    fulfillment: "delivery",
    quantity: "1",
    note: "",
    deliveryName: "Ada",
    line1: "1 Market St",
    city: "Toronto",
    region: "ON",
    postal: "m5v 2t6",
    offers,
  });
  assert.equal(delivery.error, null);
  if (delivery.error) return;
  assert.equal(delivery.details.delivery?.postal, "M5V 2T6");

  const badPostal = parseCheckoutDetails({
    fulfillment: "delivery",
    quantity: "1",
    note: "",
    deliveryName: "Ada",
    line1: "1 Market St",
    city: "Toronto",
    region: "ON",
    postal: "12345",
    offers,
  });
  assert.equal(badPostal.error, "That postal code is not allowed.");
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
  assert.equal(onboardingExemptPath("/vendors/river-fruit/buy/11111111-1111-4111-8111-111111111111"), true);
  assert.equal(onboardingExemptPath("/vendors/river-fruit/orders/11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isStallCheckoutPath("/account"), false);
  assert.equal(onboardingExemptPath("/account"), false);
});
