/** LOCALGOVY stall fee: 3.5% of the amount still charged, plus $0.25 once per checkout. */

export const PLATFORM_FLAT_CENTS = 25;
export const MIN_CHARGE_CENTS = 50;
export const MIN_FEE_PAYMENT_CENTS = 50;
export const MAX_QUANTITY = 20;
export const MAX_TERMS = 4000;
export const MAX_NOTE = 500;

const POSTAL = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

export type Fulfillment = "delivery" | "pickup" | "preorder";

export type FeeParts = {
  percentCents: number;
  flatCents: number;
  voided: boolean;
};

export type OpenFee = {
  earnedOn: string;
  percentCents: number;
  flatCents: number;
  voided: boolean;
};

export type CheckoutOffers = {
  delivery: boolean;
  pickup: boolean;
  preorder: boolean;
};

export type DeliveryAddress = {
  name: string;
  line1: string;
  city: string;
  region: string;
  postal: string;
};

export type CheckoutDetails = {
  fulfillment: Fulfillment;
  quantity: number;
  note: string | null;
  delivery: DeliveryAddress | null;
};

function wholeCents(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} is not a whole number of cents.`);
  }
}

export function percentFeeCents(chargeCents: number) {
  wholeCents(chargeCents, "Charge");
  return Math.round((chargeCents * 35) / 1000);
}

export function checkoutFeeCents(chargeCents: number) {
  return percentFeeCents(chargeCents) + PLATFORM_FLAT_CENTS;
}

export function feeAfterRefund(chargeCents: number, refundedCents: number): FeeParts {
  wholeCents(chargeCents, "Charge");
  wholeCents(refundedCents, "Refund");
  if (refundedCents > chargeCents) throw new Error("Refund is outside the charge.");
  if (refundedCents === chargeCents && chargeCents > 0) {
    return { percentCents: 0, flatCents: 0, voided: true };
  }
  return {
    percentCents: percentFeeCents(chargeCents - refundedCents),
    flatCents: PLATFORM_FLAT_CENTS,
    voided: false,
  };
}

export function feeBalanceCents(
  fees: Array<Pick<FeeParts, "percentCents" | "flatCents" | "voided">>,
  paymentsCents: number[],
) {
  const owed = fees.reduce((sum, fee) => {
    if (fee.voided) return sum;
    return sum + fee.percentCents + fee.flatCents;
  }, 0);
  const paid = paymentsCents.reduce((sum, amount) => sum + amount, 0);
  return owed - paid;
}

/** Oldest fee the payments have not fully covered. Payments apply oldest first. */
export function earliestUncoveredEarnedOn(fees: OpenFee[], paidCents: number) {
  const open = fees
    .filter((fee) => !fee.voided)
    .slice()
    .sort((a, b) => a.earnedOn.localeCompare(b.earnedOn));
  let covered = paidCents;
  for (const fee of open) {
    const amount = fee.percentCents + fee.flatCents;
    if (covered < amount) return fee.earnedOn;
    covered -= amount;
  }
  return null;
}

export function feeDueOn(earnedOn: string) {
  const year = earnedOn.slice(0, 4);
  if (!/^\d{4}$/.test(year)) return null;
  return `${year}-12-31`;
}

export function feeDueLabel(isoDate: string | null) {
  if (!isoDate || !/^\d{4}-12-31$/.test(isoDate)) return null;
  return `31 December ${isoDate.slice(0, 4)}`;
}

export function torontoDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function fulfillmentLabel(value: string) {
  if (value === "delivery") return "Delivery";
  if (value === "pickup") return "Pickup";
  if (value === "preorder") return "Preorder";
  return value;
}

export function orderStatusLabel(value: string) {
  if (value === "paid") return "Paid";
  if (value === "partially_refunded") return "Partly refunded";
  if (value === "refunded") return "Refunded";
  if (value === "pending") return "Waiting for payment";
  if (value === "expired") return "Not paid";
  return value;
}

function clip(raw: string, max: number) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return "long" as const;
  return trimmed;
}

export function parseCheckoutDetails(input: {
  fulfillment: string;
  quantity: string;
  note: string;
  deliveryName: string;
  line1: string;
  city: string;
  region: string;
  postal: string;
  offers: CheckoutOffers;
}): { error: string } | { error: null; details: CheckoutDetails } {
  const fulfillment = input.fulfillment;
  if (fulfillment !== "delivery" && fulfillment !== "pickup" && fulfillment !== "preorder") {
    return { error: "Pick delivery, pickup, or preorder." };
  }
  if (fulfillment === "delivery" && !input.offers.delivery) {
    return { error: "This item is not offered for delivery." };
  }
  if (fulfillment === "pickup" && !input.offers.pickup) {
    return { error: "This item is not offered for pickup." };
  }
  if (fulfillment === "preorder" && !input.offers.preorder) {
    return { error: "This item is not offered for preorder." };
  }

  const quantityRaw = input.quantity.trim();
  if (!/^\d+$/.test(quantityRaw)) return { error: "Pick a quantity." };
  const quantity = Number(quantityRaw);
  if (quantity < 1 || quantity > MAX_QUANTITY) {
    return { error: `Pick a quantity from 1 to ${MAX_QUANTITY}.` };
  }

  const note = clip(input.note, MAX_NOTE);
  if (note === "long") return { error: "Keep the note shorter." };

  if (fulfillment !== "delivery") {
    if (!note) return { error: "Add a note for the stall." };
    return { error: null, details: { fulfillment, quantity, note, delivery: null } };
  }

  const name = clip(input.deliveryName, 120);
  const line1 = clip(input.line1, 200);
  const city = clip(input.city, 80);
  const region = clip(input.region, 40);
  const postalRaw = input.postal.trim().toUpperCase();
  if (name === "long" || line1 === "long" || city === "long" || region === "long") {
    return { error: "Keep the address shorter." };
  }
  if (!name || !line1 || !city || !region) return { error: "Add the delivery address." };
  if (!POSTAL.test(postalRaw)) return { error: "That postal code is not allowed." };
  return {
    error: null,
    details: {
      fulfillment,
      quantity,
      note,
      delivery: { name, line1, city, region, postal: postalRaw },
    },
  };
}

export function saleReady(input: {
  forSale: boolean;
  priceCents: number | null;
  offers: CheckoutOffers;
}) {
  if (!input.forSale) return null;
  if (input.priceCents == null || input.priceCents < MIN_CHARGE_CENTS) {
    return "A sale needs a price of at least $0.50.";
  }
  if (!input.offers.delivery && !input.offers.pickup && !input.offers.preorder) {
    return "Pick delivery, pickup, or preorder.";
  }
  return null;
}
