import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { VISIT_PLAN_DAY_LIMIT, VISIT_PLAN_HOUR_LIMIT } from "@/lib/visit-plan-limit";

export type MailKind = "claim" | "claim_ip" | "visit" | "catalog" | "signin" | "signin_ip";

export const MAIL_LIMITS: Record<MailKind, { hour: number; day: number }> = {
  claim: { hour: 3, day: 10 },
  /** Shared by every guest claim from one address, whatever email they type. */
  claim_ip: { hour: 20, day: 40 },
  visit: { hour: VISIT_PLAN_HOUR_LIMIT, day: VISIT_PLAN_DAY_LIMIT },
  /** Paging the directory or product search. A person browsing stays under this. */
  catalog: { hour: 60, day: 400 },
  /** One email, right or wrong password. */
  signin: { hour: 15, day: 40 },
  /** One address, whatever email they type. */
  signin_ip: { hour: 60, day: 300 },
};

export function hashMailKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** Prefer platform-owned IP headers. Never the first X-Forwarded-For hop. */
export async function clientIp() {
  const h = await headers();
  const vercel = h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (process.env.NODE_ENV === "production") {
    return (vercel || "unknown").slice(0, 64);
  }
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

/** Drop the slots just taken when the send itself fails. */
export async function releaseMailSlot(
  service: SupabaseClient,
  kind: MailKind,
  keys: string[],
) {
  if (!keys.length) return;
  const { error } = await service.rpc("release_mail_slot", {
    p_kind: kind,
    p_keys: keys,
  });
  if (error) console.error("mail.release", error.message);
}

/** Count one directory or product page for this IP. Closed when the slot cannot be taken. */
export async function takeCatalogSlot() {
  const service = createServiceClient();
  if (!service) return false;
  const ip = await clientIp();
  return takeMailSlot(service, "catalog", [hashMailKey(`catalog:${ip}`)]);
}

/** Count one password sign-in. Closed when the counter is missing or full. */
export async function takeSignInSlot(email: string) {
  const service = createServiceClient();
  if (!service) return false;
  const ip = await clientIp();
  const normalized = email.trim().toLowerCase();
  const emailOk = await takeMailSlot(service, "signin", [hashMailKey(`signin:${normalized}`)]);
  if (!emailOk) return false;
  return takeMailSlot(service, "signin_ip", [hashMailKey(`signin-ip:${ip}`)]);
}
