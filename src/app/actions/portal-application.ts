"use server";

import { isHumanRequest } from "@/lib/bot-check";
import { CLAIM_INBOX, SITE_URL } from "@/lib/constants";
import { clientIp, hashMailKey, releaseMailSlot, takeMailSlot } from "@/lib/mail-limit";
import {
  PORTAL_ORG_COOKIE,
  clipOrganizationName,
  decodePortalOrgCookie,
  portalKind,
  portalOrgCookieOptions,
  portalRequestId,
} from "@/lib/portal-application";
import { sendPortalApplicationNotice } from "@/lib/portal-application-mail";
import { dbPublicError } from "@/lib/public-error";
import { createServiceClient } from "@/lib/supabase/admin";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type PortalApplicationResult = { error: string | null; message?: string };

async function publishedListing(kind: "vendor" | "market", id: string) {
  const service = createServiceClient();
  if (!service) return null;
  const table = kind === "vendor" ? "vendors" : "markets";
  const { data } = await service
    .from(table)
    .select("id, name, slug, status")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (!data?.slug || !data.name) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    path: kind === "vendor" ? `/vendors/${data.slug}` : `/markets/${data.slug}`,
  };
}

export async function listingPortalOwned(kind: "vendor" | "market", listingId: string) {
  const id = portalRequestId(listingId);
  if (!id) return false;
  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user) return false;
  const { data, error } = await supabase.rpc(kind === "vendor" ? "owns_vendor" : "owns_market", {
    p_id: id,
  });
  return !error && data === true;
}

export async function submitPortalApplication(formData: FormData): Promise<PortalApplicationResult> {
  if (!(await isHumanRequest())) {
    return { error: "Could not save that request." };
  }
  if (String(formData.get("_gotcha") ?? "").trim()) {
    return { error: null, message: "Thanks. We'll email you when the listing is assigned." };
  }

  const kind = portalKind(formData.get("kind"));
  if (!kind) return { error: "That portal is missing." };

  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user) {
    return { error: "Sign in first so we can assign the listing to this account." };
  }

  const requestId = portalRequestId(formData.get("request_id"));
  const organizationName = clipOrganizationName(formData.get("organization_name"));
  if (requestId && organizationName) {
    return { error: "Send the listing or the organization name, not both." };
  }
  if (!requestId && !organizationName) {
    return { error: kind === "vendor" ? "Add the stall or the organization name." : "Add the market or the organization name." };
  }

  const listing = requestId ? await publishedListing(kind, requestId) : null;
  if (requestId && !listing) return { error: "That listing is missing." };

  if (listing && (await listingPortalOwned(kind, listing.id))) {
    return {
      error: null,
      message: kind === "vendor" ? "You already edit this stall." : "You already edit this market.",
    };
  }

  const service = createServiceClient();
  if (!service) return { error: "Could not save that request." };

  const ip = await clientIp();
  const ipKey = hashMailKey(`ip:${ip}`);
  const keys = [hashMailKey(`ip:${ip}|user:${user.id}`), hashMailKey(`user:${user.id}`)];
  const ipAllowed = await takeMailSlot(service, "claim_ip", [ipKey]);
  if (!ipAllowed) return { error: "Wait a bit before sending another request." };
  const allowed = await takeMailSlot(service, "claim", keys);
  if (!allowed) {
    await releaseMailSlot(service, "claim_ip", [ipKey]);
    return { error: "Wait a bit before sending another request." };
  }

  const release = async () => {
    await releaseMailSlot(service, "claim_ip", [ipKey]);
    await releaseMailSlot(service, "claim", keys);
  };

  const { data: pending, error: pendingError } = await supabase
    .from("portal_applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", kind)
    .eq("status", "pending")
    .maybeSingle();
  if (pendingError) {
    await release();
    return { error: dbPublicError(pendingError, "Could not save that request.") };
  }

  const fields = listing
    ? { organization_name: null, requested_target_id: listing.id }
    : { organization_name: organizationName, requested_target_id: null };

  const write = pending
    ? await supabase.from("portal_applications").update(fields).eq("id", pending.id).eq("user_id", user.id)
    : await supabase.from("portal_applications").insert({
        user_id: user.id,
        kind,
        ...fields,
      });
  if (write.error?.code === "23505" && !pending) {
    const retry = await supabase
      .from("portal_applications")
      .update(fields)
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("status", "pending");
    if (retry.error) {
      await release();
      return { error: dbPublicError(retry.error, "Could not save that request.") };
    }
  } else if (write.error) {
    await release();
    return { error: dbPublicError(write.error, "Could not save that request.") };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = profile?.display_name?.trim() || user.email || "Account";
  if (user.email) {
    await sendPortalApplicationNotice({
      to: CLAIM_INBOX,
      replyTo: user.email,
      kind,
      name,
      email: user.email,
      organizationName: listing ? null : organizationName,
      listingName: listing?.name ?? null,
      listingUrl: listing ? `${SITE_URL}${listing.path}` : null,
    });
  }

  const jar = await cookies();
  jar.set(PORTAL_ORG_COOKIE, "", { ...portalOrgCookieOptions(), maxAge: 0 });
  revalidatePath(kind === "vendor" ? "/vendor" : "/market");
  revalidatePath("/account");
  revalidatePath("/admin/applications");
  return { error: null, message: "Thanks. We'll email you when the listing is assigned." };
}

export async function readPortalOrgDefault() {
  const jar = await cookies();
  return decodePortalOrgCookie(jar.get(PORTAL_ORG_COOKIE)?.value);
}
