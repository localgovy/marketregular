"use server";

import { listMarkets, listSchedules } from "@/lib/data/catalog";
import { SITE_NAME } from "@/lib/constants";
import { fetchMyProfile } from "@/lib/my-profile";
import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { visitPlanHtml, visitPlanText, weekPlanForSlugs } from "@/lib/visit-plan";
import type { MarketSchedule } from "@/types/database";
import { Resend } from "resend";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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

  const profile = await fetchMyProfile(supabase);
  if (!profile) return { error: "Sign in first." };

  const stored = profile.favorite_market_slugs;
  const picked = (slugs.length ? slugs : stored).filter(validSlug);
  const unique = [...new Set(picked)].slice(0, 3);
  if (unique.length === 0) return { error: "Pick at least one market first." };

  const service = createServiceClient();
  if (!service) return { error: "Visit email is not set up yet." };
  const { data: reserved, error: reserveError } = await service.rpc(
    "stamp_visit_plan_emailed_at",
    { p_user_id: user.id },
  );
  if (reserveError) return { error: reserveError.message };
  if (reserved !== true) {
    return { error: "Wait a few minutes before sending again." };
  }

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

  return { error: null, message: `Sent to ${user.email}` };
}
