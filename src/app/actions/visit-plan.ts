"use server";

import { listMarkets, listSchedules } from "@/lib/data/catalog";
import { SITE_NAME } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { visitPlanHtml, visitPlanText, weekPlanForSlugs } from "@/lib/visit-plan";
import type { MarketSchedule } from "@/types/database";
import { Resend } from "resend";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RATE_MS = 10 * 60 * 1000;

function validSlug(slug: string) {
  return slug.length >= 1 && slug.length <= 160 && SLUG.test(slug);
}

export async function emailVisitPlan(slugs: string[]) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("favorite_market_slugs, visit_plan_emailed_at")
    .eq("id", user.id)
    .maybeSingle();

  const sentAt = profile?.visit_plan_emailed_at
    ? new Date(profile.visit_plan_emailed_at).getTime()
    : 0;
  if (sentAt && Date.now() - sentAt < RATE_MS) {
    return { error: "Wait a few minutes before sending again." };
  }

  const stored = Array.isArray(profile?.favorite_market_slugs)
    ? profile.favorite_market_slugs.filter((item): item is string => typeof item === "string")
    : [];
  const picked = (slugs.length ? slugs : stored).filter(validSlug);
  const unique = [...new Set(picked)].slice(0, 3);
  if (unique.length === 0) return { error: "Pick at least one market first." };

  const [markets, schedules] = await Promise.all([listMarkets(), listSchedules()]);
  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }
  const groups = weekPlanForSlugs(unique, markets, scheduleMap);

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: user.email,
    subject: `This week’s markets — ${SITE_NAME}`,
    text: visitPlanText(groups),
    html: visitPlanHtml(groups),
  });
  if (error) return { error: error.message };

  await supabase
    .from("profiles")
    .update({ visit_plan_emailed_at: new Date().toISOString() })
    .eq("id", user.id);

  return { error: null, message: `Sent to ${user.email}` };
}
