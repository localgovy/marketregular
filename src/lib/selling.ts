import { inSeason } from "@/lib/schedule";

/**
 * New stalls: 4% of the item subtotal. Shoppers also pay a service fee of $0.50
 * under $15, or $0.99 at $15 and up. A per-vendor override can change the
 * commission. The $0.70 fallback is reserved and is not charged.
 *
 * Public Buy also needs published_menus.can_buy, admin approval, and an active
 * card account. Alcohol reservations do not charge a card.
 */
export const VENDOR_SALES_OPEN = true;

export const DEFAULT_COMMISSION_BPS = 400;
export const SERVICE_FEE_THRESHOLD_CENTS = 1500;
export const SERVICE_FEE_UNDER_CENTS = 50;
export const SERVICE_FEE_AT_LEAST_CENTS = 99;
/** Reserved if small orders dominate. Not charged. */
export const SERVICE_FEE_FALLBACK_CENTS = 70;
export const MIN_CHARGE_CENTS = 50;
export const MAX_QUANTITY = 20;
export const MAX_TERMS = 4000;
export const MAX_NOTE = 500;

export type Fulfillment = "delivery" | "pickup" | "preorder";

export type FeeParts = {
  commissionCents: number;
  flatCents: number;
  serviceFeeCents: number;
  voided: boolean;
};

export type OpenFee = {
  earnedOn: string;
  commissionCents: number;
  flatCents: number;
  serviceFeeCents: number;
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

export type FeeSchedule = {
  commissionBps: number;
  flatCents: number;
};

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  commissionBps: DEFAULT_COMMISSION_BPS,
  flatCents: 0,
};

export type FeeOverride = {
  introBps: number;
  standardBps: number;
  flatCents: number;
  introUntil: string | null;
};

function commissionBps(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 10_000) {
    throw new Error("Commission rate is not allowed.");
  }
}

/** 4% of the item subtotal, or the stall's override. The service fee is not in the base. */
export function commissionCents(subtotalCents: number, schedule: FeeSchedule = DEFAULT_FEE_SCHEDULE) {
  wholeCents(subtotalCents, "Subtotal");
  wholeCents(schedule.flatCents, "Flat fee");
  commissionBps(schedule.commissionBps);
  return Math.round((subtotalCents * schedule.commissionBps) / 10_000) + schedule.flatCents;
}

/** $0.50 under $15, $0.99 at $15 and up. Compared to the item subtotal. */
export function serviceFeeCents(subtotalCents: number) {
  wholeCents(subtotalCents, "Subtotal");
  if (subtotalCents < SERVICE_FEE_THRESHOLD_CENTS) return SERVICE_FEE_UNDER_CENTS;
  return SERVICE_FEE_AT_LEAST_CENTS;
}

export function checkoutTotalCents(subtotalCents: number) {
  return subtotalCents + serviceFeeCents(subtotalCents);
}

/** Commission plus the shopper service fee. Stripe's processing fee is not included. */
export function applicationFeeCents(subtotalCents: number, schedule: FeeSchedule = DEFAULT_FEE_SCHEDULE) {
  return commissionCents(subtotalCents, schedule) + serviceFeeCents(subtotalCents);
}

export function scheduleForOverride(override: FeeOverride | null, now = new Date()): FeeSchedule {
  if (!override) return DEFAULT_FEE_SCHEDULE;
  const until = override.introUntil ? Date.parse(override.introUntil) : Number.NaN;
  const inIntro = !override.introUntil || (Number.isFinite(until) && now.getTime() < until);
  return {
    commissionBps: inIntro ? override.introBps : override.standardBps,
    flatCents: override.flatCents,
  };
}

/** Year one ends 12 calendar months after the first paid order. */
export function introUntilFromFirstPaid(paidAt: Date) {
  const next = new Date(paidAt.getTime());
  next.setUTCMonth(next.getUTCMonth() + 12);
  return next.toISOString();
}

/** The menu price in CAD, ignoring tax Stripe may add on top. */
export function checkoutAmountMatches(
  currency: string | null | undefined,
  amountSubtotal: number | null | undefined,
  amountTotal: number | null | undefined,
  chargeCents: number,
) {
  if (currency?.toLowerCase() !== "cad") return false;
  const amount = amountSubtotal ?? amountTotal;
  return typeof amount === "number" && amount === chargeCents;
}

/**
 * A connected account can create its own Checkout Session and put any order id
 * in the metadata. Only the session this app stored, on that stall's account,
 * can pay or expire the order. A missing event account still has to match the
 * stored session id.
 */
export function stallCheckoutBinds(input: {
  storedSessionId: string | null;
  sessionId: string;
  eventAccount: string | null;
  vendorAccount: string | null;
}) {
  if (!input.storedSessionId || input.storedSessionId !== input.sessionId) return false;
  if (!input.vendorAccount) return false;
  if (input.eventAccount && input.eventAccount !== input.vendorAccount) return false;
  return true;
}

export function stallExpireBinds(storedSessionId: string | null, sessionId: string) {
  return storedSessionId !== null && storedSessionId === sessionId;
}

/** Stall fees are charged on the platform account, and only for a session we opened. */
export function platformFeeBinds(input: {
  eventAccount: string | null;
  currency: string | null | undefined;
  expectedVendorId: string | null;
  expectedAmountCents: number | null;
  sessionVendorId: string | null;
  paidAmountCents: number | null;
}) {
  if (input.eventAccount) return false;
  if (input.currency?.toLowerCase() !== "cad") return false;
  if (!input.expectedVendorId || input.expectedAmountCents == null) return false;
  if (!input.sessionVendorId || input.paidAmountCents == null) return false;
  return (
    input.sessionVendorId === input.expectedVendorId &&
    input.paidAmountCents === input.expectedAmountCents
  );
}

/** Money already back with the buyer. A later reversal does not shrink an earlier one. */
export function returnedCents(chargeCents: number, alreadyCents: number, incomingCents: number) {
  wholeCents(chargeCents, "Charge");
  wholeCents(alreadyCents, "Refund");
  wholeCents(incomingCents, "Reversal");
  return Math.min(chargeCents, Math.max(alreadyCents, incomingCents));
}

/** A later refund event must not restore credit a larger refund already removed. */
export function feeCreditAfterReturn(storedCents: number, chargeCents: number, returned: number) {
  const remaining = chargeCents - Math.min(chargeCents, Math.max(0, returned));
  if (remaining >= storedCents) return { action: "keep" as const };
  if (remaining >= 1) return { action: "lower" as const, amountCents: remaining };
  return { action: "drop" as const };
}

export function itemRefundedCents(subtotalCents: number, serviceCents: number, stripeRefundedCents: number) {
  wholeCents(subtotalCents, "Subtotal");
  wholeCents(serviceCents, "Service fee");
  wholeCents(stripeRefundedCents, "Refund");
  const checkout = subtotalCents + serviceCents;
  if (checkout > 0 && stripeRefundedCents >= checkout) return subtotalCents;
  return Math.min(subtotalCents, stripeRefundedCents);
}

/** The service fee comes back only when the refund covers the item and the fee. */
export function serviceFeeRefunded(subtotalCents: number, serviceCents: number, stripeRefundedCents: number) {
  wholeCents(subtotalCents, "Subtotal");
  wholeCents(serviceCents, "Service fee");
  wholeCents(stripeRefundedCents, "Refund");
  const checkout = subtotalCents + serviceCents;
  return checkout > 0 && stripeRefundedCents >= checkout;
}

export type LedgerFee = {
  percentCents: number;
  flatCents: number;
  serviceFeeCents: number;
  voided: boolean;
};

/**
 * Amounts written to platform_fees. The flat amount is whatever the stall's
 * schedule charged. When Stripe's application fee does not match, the charged
 * total is kept in percent_cents so the ledger still balances.
 */
export function ledgerFee(parts: FeeParts, actualApplicationFeeCents?: number | null): LedgerFee {
  const expected = parts.voided
    ? 0
    : parts.commissionCents + parts.flatCents + parts.serviceFeeCents;
  const mismatch =
    !parts.voided &&
    typeof actualApplicationFeeCents === "number" &&
    actualApplicationFeeCents !== expected;
  if (mismatch) {
    return {
      percentCents: actualApplicationFeeCents,
      flatCents: 0,
      serviceFeeCents: 0,
      voided: false,
    };
  }
  if (parts.voided) {
    return { percentCents: 0, flatCents: 0, serviceFeeCents: 0, voided: true };
  }
  return {
    percentCents: parts.commissionCents,
    flatCents: parts.flatCents,
    serviceFeeCents: parts.serviceFeeCents,
    voided: false,
  };
}

/** Cents of the application fee to return so Stripe still holds the fee on what remains. */
export function applicationFeeRefundCents(input: {
  applicationFeeCents: number;
  alreadyRefundedCents: number;
  subtotalCents: number;
  refundedSubtotalCents: number;
  schedule: FeeSchedule;
  serviceFeeCents: number;
  serviceFeeReturned: boolean;
}) {
  wholeCents(input.applicationFeeCents, "Application fee");
  wholeCents(input.alreadyRefundedCents, "Refunded fee");
  if (input.alreadyRefundedCents > input.applicationFeeCents) {
    throw new Error("Refund is outside the charge.");
  }
  const parts = feeAfterRefund({
    subtotalCents: input.subtotalCents,
    refundedSubtotalCents: input.refundedSubtotalCents,
    schedule: input.schedule,
    serviceFeeCents: input.serviceFeeCents,
    serviceFeeReturned: input.serviceFeeReturned,
  });
  const stillDue = parts.voided ? 0 : parts.commissionCents + parts.flatCents + parts.serviceFeeCents;
  return Math.max(0, input.applicationFeeCents - input.alreadyRefundedCents - stillDue);
}

/** A full refund voids the commission, the flat amount, and the service fee. */
export function feeAfterRefund(input: {
  subtotalCents: number;
  refundedSubtotalCents: number;
  schedule: FeeSchedule;
  serviceFeeCents: number;
  serviceFeeReturned?: boolean;
}): FeeParts {
  wholeCents(input.subtotalCents, "Subtotal");
  wholeCents(input.refundedSubtotalCents, "Refund");
  wholeCents(input.serviceFeeCents, "Service fee");
  if (input.refundedSubtotalCents > input.subtotalCents) {
    throw new Error("Refund is outside the charge.");
  }
  const itemRefunded =
    input.refundedSubtotalCents === input.subtotalCents && input.subtotalCents > 0;
  if (itemRefunded && input.serviceFeeReturned) {
    return { commissionCents: 0, flatCents: 0, serviceFeeCents: 0, voided: true };
  }
  if (itemRefunded) {
    return {
      commissionCents: 0,
      flatCents: 0,
      serviceFeeCents: input.serviceFeeCents,
      voided: false,
    };
  }
  const remaining = input.subtotalCents - input.refundedSubtotalCents;
  commissionBps(input.schedule.commissionBps);
  return {
    commissionCents: Math.round((remaining * input.schedule.commissionBps) / 10_000),
    flatCents: input.schedule.flatCents,
    serviceFeeCents: input.serviceFeeCents,
    voided: false,
  };
}

function openFeeAmount(fee: Pick<FeeParts, "commissionCents" | "flatCents" | "serviceFeeCents" | "voided">) {
  if (fee.voided) return 0;
  return fee.commissionCents + fee.flatCents + fee.serviceFeeCents;
}

export function feeBalanceCents(
  fees: Array<Pick<FeeParts, "commissionCents" | "flatCents" | "serviceFeeCents" | "voided">>,
  paymentsCents: number[],
) {
  const owed = fees.reduce((sum, fee) => sum + openFeeAmount(fee), 0);
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
    const amount = openFeeAmount(fee);
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

export function orderStatusLabel(value: string, readyAt?: string | null) {
  if (value === "paid" && readyAt) return "Ready for pickup";
  if (value === "paid") return "Paid";
  if (value === "partially_refunded") return "Partly refunded";
  if (value === "refunded") return "Refunded";
  if (value === "reserved") return "Reserved";
  if (value === "cancelled") return "Cancelled";
  if (value === "pending") return "Waiting for payment";
  if (value === "expired") return "Not paid";
  return value;
}

const TORONTO = "America/Toronto";
const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function torontoWeekday(now = new Date()) {
  const short = new Intl.DateTimeFormat("en-US", { timeZone: TORONTO, weekday: "short" }).format(now);
  return WEEKDAY_SHORT[short] ?? 0;
}

/** A Toronto wall-clock time as a UTC instant. */
export function torontoInstant(date: string, opensAt: string) {
  const hm = opensAt.slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(hm)) return null;
  const utcGuess = new Date(`${date}T${hm}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TORONTO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcGuess);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const shown = Date.UTC(
    Number(read("year")),
    Number(read("month")) - 1,
    Number(read("day")),
    Number(read("hour")),
    Number(read("minute")),
  );
  const wanted = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(hm.slice(0, 2)),
    Number(hm.slice(3, 5)),
  );
  return new Date(utcGuess.getTime() + (wanted - shown)).toISOString();
}

export function sameDayPickupStart(
  now: Date,
  sessions: Array<{
    weekday: number;
    opensAt: string;
    seasonStart: string | null;
    seasonEnd: string | null;
  }>,
) {
  const weekday = torontoWeekday(now);
  const opens = sessions
    .filter(
      (session) =>
        session.weekday === weekday && inSeason(now, session.seasonStart, session.seasonEnd, TORONTO),
    )
    .map((session) => session.opensAt.slice(0, 5))
    .filter((value) => /^\d{2}:\d{2}$/.test(value))
    .sort();
  const earliest = opens[0];
  if (!earliest) return null;
  return torontoInstant(torontoDate(now), earliest);
}

/** Full refund until the order is ready and a real pickup time has started. */
export function shopperCancelAllowed(input: {
  status: string;
  readyAt: string | null;
  pickupStartsAt: string | null;
  disputedAt?: string | null;
  now?: Date;
}) {
  if (input.disputedAt) return false;
  if (input.status !== "paid" && input.status !== "reserved") return false;
  if (input.status === "reserved") return !input.readyAt;
  if (!input.readyAt) return true;
  if (!input.pickupStartsAt) return true;
  const starts = Date.parse(input.pickupStartsAt);
  if (!Number.isFinite(starts)) return true;
  return (input.now ?? new Date()).getTime() < starts;
}

/** A later pickup time. A time that has started, or one earlier than the saved time, is refused. */
export function futurePickupStart(raw: string, now: Date, existing: string | null) {
  const match = raw.trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  const starts = match ? torontoInstant(match[1], match[2]) : null;
  if (!starts) return { error: "That pickup time is not allowed." as const, starts: null };
  const instant = Date.parse(starts);
  if (!Number.isFinite(instant) || instant <= now.getTime()) {
    return { error: "Pick a pickup time that has not started." as const, starts: null };
  }
  if (existing) {
    const current = Date.parse(existing);
    if (Number.isFinite(current) && instant < current) {
      return { error: "That pickup time is earlier than the one already set." as const, starts: null };
    }
  }
  return { error: null, starts };
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
  if (fulfillment === "delivery") return { error: "Delivery is not available." };
  if (fulfillment !== "pickup" && fulfillment !== "preorder") {
    return { error: "Pick pickup or preorder." };
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
  if (!note) return { error: "Add a note for the stall." };
  return { error: null, details: { fulfillment, quantity, note, delivery: null } };
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
  if (!input.offers.pickup && !input.offers.preorder) {
    return "Pick pickup or preorder.";
  }
  return null;
}
