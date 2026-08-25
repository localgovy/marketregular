import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VISIT_PLAN_DAY_LIMIT, VISIT_PLAN_HOUR_LIMIT } from "@/lib/visit-plan-limit";

export type MailKind = "claim" | "visit";

export const MAIL_LIMITS: Record<MailKind, { hour: number; day: number }> = {
  claim: { hour: 3, day: 10 },
  visit: { hour: VISIT_PLAN_HOUR_LIMIT, day: VISIT_PLAN_DAY_LIMIT },
};

export function hashMailKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Prefer platform-owned IP headers. Never the first X-Forwarded-For hop. */
export async function clientIp() {
  const h = await headers();
  const vercel = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const real = h.get("x-real-ip")?.trim();
  const cf = h.get("cf-connecting-ip")?.trim();
  const forwarded = h.get("x-forwarded-for");
  const lastForwarded = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  const ip = vercel || real || cf || lastForwarded || "unknown";
  return ip.slice(0, 64);
}

export async function takeMailSlot(
  service: SupabaseClient,
  kind: MailKind,
  keys: string[],
): Promise<boolean> {
  if (!keys.length) return false;
  const { hour, day } = MAIL_LIMITS[kind];
  const { data, error } = await service.rpc("take_mail_slot", {
    p_kind: kind,
    p_keys: keys,
    p_hour_limit: hour,
    p_day_limit: day,
  });
  if (error) return false;
  return data === true;
}
