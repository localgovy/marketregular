"use server";

import { getMarketBySlug } from "@/lib/data/catalog";
import {
  formatSlipDate,
  hoursOnIso,
  isSlipDateInRange,
  mapsUrl,
  validPlanSlug,
  weekdayFromIso,
  type TravelMode,
} from "@/lib/day-plan";
import { sanitizeMailHeader } from "@/lib/mail-header";
import { clientIp, hashMailKey, takeMailSlot } from "@/lib/mail-limit";
import { fetchMyProfile } from "@/lib/my-profile";
import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { daySlipHtml, daySlipText } from "@/lib/visit-plan";
import { DAY_PLAN_NAME, DAY_PLAN_TODAY } from "@/lib/constants";
import { visitPlanWaitCopy, visitPlanWaitMs, VISIT_PLAN_COOLDOWN_MS } from "@/lib/visit-plan-limit";
import { Resend } from "resend";

const MODES: TravelMode[] = ["walk", "transit", "drive"];
const MAIL_FAIL = "Could not send right now.";

export type DayPlanStall = {
  slug: string;
  name: string;
  rating_avg: number | null;
  review_count: number;
};

export async function listDayPlanStalls(marketSlug: string, date: string) {
  if (!validPlanSlug(marketSlug) || !isSlipDateInRange(date)) {
    return { hours: "", stalls: [] as DayPlanStall[] };
  }
  const market = await getMarketBySlug(marketSlug);
  if (!market) return { hours: "", stalls: [] as DayPlanStall[] };
  const weekday = weekdayFromIso(date);
  const hours = hoursOnIso(market.schedules, market.province, date);
  const stalls = market.vendors
    .filter((vendor) => !vendor.days.length || vendor.days.includes(weekday))
    .map((vendor) => ({
      slug: vendor.slug,
      name: vendor.name,
      rating_avg: vendor.rating_avg ?? null,
      review_count: vendor.review_count ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { hours, stalls };
}

export async function emailDaySlip(input: {
  marketSlug: string;
  date: string;
  vendorSlugs: string[];
  mode: TravelMode;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !from) {
    return { error: "Visit email is not set up yet." };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sign in first." };

  const profile = await fetchMyProfile(supabase);
  if (!profile) return { error: "Sign in first." };

  if (!validPlanSlug(input.marketSlug) || !isSlipDateInRange(input.date)) {
    return { error: `That ${DAY_PLAN_NAME} is missing a hall.` };
  }
  if (!MODES.includes(input.mode)) {
    return { error: `That ${DAY_PLAN_NAME} is missing how you go.` };
  }

  const market = await getMarketBySlug(input.marketSlug);
  if (!market) return { error: "That hall is not on the board." };

  const waitMs = visitPlanWaitMs(profile.visit_plan_emailed_at);
  if (waitMs > 0) {
    return { error: null, wait: true, message: visitPlanWaitCopy(waitMs) };
  }

  const service = createServiceClient();
  if (!service) return { error: "Visit email is not set up yet." };

  const ip = await clientIp();
  const keys = [hashMailKey(`ip:${ip}|email:${user.email}`), hashMailKey(`user:${user.id}`)];
  const allowed = await takeMailSlot(service, "visit", keys);
  if (!allowed) {
    return {
      error: null,
      wait: true,
      message: "Already sent a few times today. Try again tomorrow.",
    };
  }

  const { data: reserved, error: reserveError } = await service.rpc(
    "stamp_visit_plan_emailed_at",
    { p_user_id: user.id },
  );
  if (reserveError) return { error: MAIL_FAIL };
  if (reserved !== true) {
    return { error: null, wait: true, message: visitPlanWaitCopy(VISIT_PLAN_COOLDOWN_MS) };
  }

  const hours = hoursOnIso(market.schedules, market.province, input.date);
  const wanted = new Set(input.vendorSlugs.filter(validPlanSlug).slice(0, 80));
  const stalls = market.vendors
    .filter((vendor) => wanted.has(vendor.slug))
    .map((vendor) => vendor.name);

  const modeLabel = input.mode === "walk" ? "Walk" : input.mode === "transit" ? "Transit" : "Drive";
  const slip = {
    marketName: market.name,
    marketSlug: market.slug,
    address: market.address,
    dateLabel: formatSlipDate(input.date),
    hours: hours || "See the listing for hours",
    modeLabel,
    mapsUrl: mapsUrl(market.lat, market.lng, input.mode),
    about: null,
    stalls,
  };

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: user.email,
    subject: sanitizeMailHeader(`${DAY_PLAN_TODAY} — ${market.name}`),
    text: daySlipText(slip),
    html: daySlipHtml(slip),
  });
  if (error) return { error: MAIL_FAIL };

  return { error: null, message: `Sent to ${user.email}` };
}
