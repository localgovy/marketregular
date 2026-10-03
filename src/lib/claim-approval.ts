import { prepareVendorClaimPassword } from "@/lib/issue-vendor-password";
import { dbPublicError } from "@/lib/public-error";
import { vendorPasswordKey } from "@/lib/vendor-password";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClaimMailFailure = {
  password: "0" | "1";
  vendorId: string;
};

export type ClaimDecisionResult = {
  error: string | null;
  committed: boolean;
  paths: string[];
  vendorId: string | null;
  mailFailed: ClaimMailFailure | null;
};

function stopped(error: string): ClaimDecisionResult {
  return { error, committed: false, paths: [], vendorId: null, mailFailed: null };
}

function clipNote(note: string | undefined) {
  const clipped = (note ?? "").trim().slice(0, 500);
  return clipped || null;
}

async function listingPath(
  admin: SupabaseClient,
  table: "markets" | "vendors",
  id: string,
) {
  const { data } = await admin.from(table).select("slug").eq("id", id).maybeSingle();
  const slug = data && typeof data === "object" && "slug" in data && typeof data.slug === "string" ? data.slug : "";
  if (!slug) return null;
  return table === "markets" ? `/markets/${slug}` : `/vendors/${slug}`;
}

/**
 * Approves or rejects a claim. A stall password is written only after
 * `decide_claim` succeeds, so a failed approval cannot replace the
 * password they already use to sign in.
 */
export async function applyClaimDecision(
  admin: SupabaseClient,
  input: { id: string; status: string; note?: string },
  sendMail: (email: string, password?: string) => Promise<{ sent: boolean }>,
): Promise<ClaimDecisionResult> {
  if (input.status !== "approved" && input.status !== "rejected") {
    return stopped("Could not update that claim.");
  }
  const { data: claim, error: lookupError } = await admin
    .from("claim_requests")
    .select("target_type, target_id, user_id")
    .eq("id", input.id)
    .maybeSingle();
  if (lookupError) return stopped(dbPublicError(lookupError, "Could not update that claim."));
  if (!claim?.target_type || !claim.target_id) return stopped("Claim not found");

  const vendorApproval = input.status === "approved" && claim.target_type === "vendor" && Boolean(claim.user_id);
  if (vendorApproval) {
    if (!vendorPasswordKey()) return stopped("Stall passwords are not configured yet.");
    const { data: stall, error: stallError } = await admin
      .from("vendors")
      .select("claimed_by")
      .eq("id", claim.target_id)
      .maybeSingle();
    if (stallError) return stopped(dbPublicError(stallError, "Could not update that claim."));
    if (!stall) return stopped("That listing is missing.");
    if (stall.claimed_by && stall.claimed_by !== claim.user_id) {
      return stopped("That listing is already claimed.");
    }
  }

  const { error } = await admin.rpc("decide_claim", {
    p_id: input.id,
    p_status: input.status,
    p_note: clipNote(input.note),
  });
  if (error) return stopped(dbPublicError(error, "Could not update that claim."));

  const table = claim.target_type === "market" ? "markets" : "vendors";
  const path = await listingPath(admin, table, claim.target_id);
  const paths = path ? [path] : [];
  if (!vendorApproval || !claim.user_id) {
    return { error: null, committed: true, paths, vendorId: null, mailFailed: null };
  }

  const prepared = await prepareVendorClaimPassword(admin, claim.user_id);
  if (prepared.error !== null) {
    return { error: prepared.error, committed: true, paths, vendorId: claim.target_id, mailFailed: null };
  }
  const mailed = await sendMail(prepared.email, prepared.password ?? undefined);
  if (!mailed.sent) {
    return {
      error: null,
      committed: true,
      paths,
      vendorId: claim.target_id,
      mailFailed: {
        password: prepared.password ? "1" : "0",
        vendorId: claim.target_id,
      },
    };
  }
  return { error: null, committed: true, paths, vendorId: claim.target_id, mailFailed: null };
}
