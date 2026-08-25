import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

const HOUR_LIMIT = 3;
const DAY_LIMIT = 10;

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

export async function claimMailAllowed(
  service: SupabaseClient,
  keys: string[],
): Promise<boolean> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  for (const key_hash of keys) {
    const { count: hourCount, error: hourError } = await service
      .from("mail_sends")
      .select("id", { count: "exact", head: true })
      .eq("kind", "claim")
      .eq("key_hash", key_hash)
      .gte("created_at", hourAgo);
    if (hourError || (hourCount ?? 0) >= HOUR_LIMIT) return false;
    const { count: dayCount, error: dayError } = await service
      .from("mail_sends")
      .select("id", { count: "exact", head: true })
      .eq("kind", "claim")
      .eq("key_hash", key_hash)
      .gte("created_at", dayAgo);
    if (dayError || (dayCount ?? 0) >= DAY_LIMIT) return false;
  }
  return true;
}

export async function recordClaimMail(service: SupabaseClient, keys: string[]) {
  if (!keys.length) return;
  await service.from("mail_sends").insert(keys.map((key_hash) => ({ kind: "claim", key_hash })));
}
