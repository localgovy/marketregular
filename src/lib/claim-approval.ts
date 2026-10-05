import { prepareVendorClaimPassword } from "@/lib/issue-vendor-password";
import { dbPublicError } from "@/lib/public-error";
import { vendorPasswordKey } from "@/lib/vendor-password";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ClaimMailFailure = {
  password: "0" | "1";
  vendorId: string | null;
  marketId: string | null;
};

export type ClaimDecisionResult = {
  error: string | null;
  committed: boolean;
  paths: string[];
  vendorId: string | null;
  marketId: string | null;
  mailFailed: ClaimMailFailure | null;
};

function stopped(error: string): ClaimDecisionResult {
  return { error, committed: false, paths: [], vendorId: null, marketId: null, mailFailed: null };
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
 * Approves or rejects a claim. An account password is written only after
 * `decide_claim` succeeds, so a failed approval cannot replace the
 * password they already use to sign in. A market approval uses that same
 * account password and does not change the stall role.
 */
export async function applyClaimDecision(
  admin: SupabaseClient,
  input: { id: string; status: string; note?: string },
  sendMail: (
    email: string,
    password: string | undefined,
    kind: "market" | "vendor",
  ) => Promise<{ sent: boolean }>,
): Promise<ClaimDecisionResult> {
  if (input.status !== "approved" && input.status !== "rejected") {
    return stopped("Could not update that claim.");
  }
  const { data: claim, error: lookupError } = await admin
    .from("claim_requests")
    .select("target_type, target_id, user_id, status")
    .eq("id", input.id)
    .maybeSingle();
  if (lookupError) return stopped(dbPublicError(lookupError, "Could not update that claim."));
  if (!claim?.target_type || !claim.target_id) return stopped("Claim not found");
  if (claim.status !== "pending") return stopped("That claim is already decided.");
  const kind = claim.target_type === "market" ? "market" : claim.target_type === "vendor" ? "vendor" : null;

  const listingApproval = input.status === "approved" && kind !== null && Boolean(claim.user_id);
  if (listingApproval && kind) {
    if (!vendorPasswordKey()) return stopped("Stall passwords are not configured yet.");
    const table = kind === "market" ? "markets" : "vendors";
    const { data: listing, error: listingError } = await admin
      .from(table)
      .select("claimed_by")
      .eq("id", claim.target_id)
      .maybeSingle();
    if (listingError) return stopped(dbPublicError(listingError, "Could not update that claim."));
    if (!listing) return stopped("That listing is missing.");
    if (listing.claimed_by && listing.claimed_by !== claim.user_id) {
      return stopped("That listing is already claimed.");
    }
  }

  const { error } = await admin.rpc("decide_claim", {
    p_id: input.id,
    p_status: input.status,
    p_note: clipNote(input.note),
  });
  if (error) return stopped(dbPublicError(error, "Could not update that claim."));

  if (input.status === "approved" && claim.user_id && kind) {
    const { error: closeError } = await admin
      .from("portal_applications")
      .update({ status: "approved", assigned_target_id: claim.target_id })
      .eq("user_id", claim.user_id)
      .eq("kind", kind)
      .eq("status", "pending");
    if (closeError) console.error("claim.closeApplication", closeError.message);
  }

  const table = kind === "market" ? "markets" : "vendors";
  const path = kind ? await listingPath(admin, table, claim.target_id) : null;
  const paths = path ? [path] : [];
  const vendorId = kind === "vendor" ? claim.target_id : null;
  const marketId = kind === "market" ? claim.target_id : null;
  if (!listingApproval || !claim.user_id || !kind) {
    return { error: null, committed: true, paths, vendorId: null, marketId: null, mailFailed: null };
  }

  const prepared = await prepareVendorClaimPassword(admin, claim.user_id);
  if (prepared.error !== null) {
    return { error: prepared.error, committed: true, paths, vendorId, marketId, mailFailed: null };
  }
  const mailed = await sendMail(prepared.email, prepared.password ?? undefined, kind);
  if (!mailed.sent) {
    return {
      error: null,
      committed: true,
      paths,
      vendorId,
      marketId,
      mailFailed: {
        password: prepared.password ? "1" : "0",
        vendorId,
        marketId,
      },
    };
  }
  return { error: null, committed: true, paths, vendorId, marketId, mailFailed: null };
}
