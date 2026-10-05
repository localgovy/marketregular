import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import type { ClaimTarget } from "@/types/database";

/** True when another account already runs this published listing. */
export async function listingIsClaimed(kind: ClaimTarget, id: string) {
  const service = createServiceClient();
  if (!service) return false;
  const table = kind === "vendor" ? "vendors" : "markets";
  const { data } = await service.from(table).select("claimed_by").eq("id", id).maybeSingle();
  return Boolean(data?.claimed_by);
}
