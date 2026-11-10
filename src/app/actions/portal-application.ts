"use server";

import { isHumanRequest } from "@/lib/bot-check";
import {
  filePortalApplication,
  type PortalApplicationResult,
} from "@/lib/file-portal-application";
import {
  PORTAL_ORG_COOKIE,
  clipOrganizationName,
  decodePortalOrgCookie,
  portalKind,
  portalRequestId,
} from "@/lib/portal-application";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export type { PortalApplicationResult };

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

  return filePortalApplication({
    supabase,
    kind,
    requestId: portalRequestId(formData.get("request_id")),
    organizationName: clipOrganizationName(formData.get("organization_name")),
  });
}

export async function readPortalOrgDefault() {
  const jar = await cookies();
  return decodePortalOrgCookie(jar.get(PORTAL_ORG_COOKIE)?.value);
}
