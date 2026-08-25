import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VISIT_PLAN_DAY_LIMIT, VISIT_PLAN_HOUR_LIMIT } from "@/lib/visit-plan-limit";

export type MailKind = "claim" | "visit";

const LIMITS: Record<MailKind, { hour: number; day: number }> = {
  claim: { hour: 3, day: 10 },
  visit: { hour: VISIT_PLAN_HOUR_LIMIT, day: VISIT_PLAN_DAY_LIMIT },
};

export function hashMailKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function clientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("cf-connecting-ip")?.trim() ||
    "unknown";
  return ip.slice(0, 64);
}

export async function mailAllowed(
  service: SupabaseClient,
  kind: MailKind,
  keys: string[],
): Promise<boolean> {
  const { hour: hourLimit, day: dayLimit } = LIMITS[kind];
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  for (const key_hash of keys) {
    const { count: hourCount, error: hourError } = await service
      .from("mail_sends")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .eq("key_hash", key_hash)
      .gte("created_at", hourAgo);
    if (hourError || (hourCount ?? 0) >= hourLimit) return false;
    const { count: dayCount, error: dayError } = await service
      .from("mail_sends")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .eq("key_hash", key_hash)
      .gte("created_at", dayAgo);
    if (dayError || (dayCount ?? 0) >= dayLimit) return false;
  }
  return true;
}

export async function recordMail(service: SupabaseClient, kind: MailKind, keys: string[]) {
  if (!keys.length) return;
  await service.from("mail_sends").insert(keys.map((key_hash) => ({ kind, key_hash })));
}

export async function claimMailAllowed(service: SupabaseClient, keys: string[]) {
  return mailAllowed(service, "claim", keys);
}

export async function recordClaimMail(service: SupabaseClient, keys: string[]) {
  return recordMail(service, "claim", keys);
}
