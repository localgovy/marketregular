"use server";

import { parseMarketPortal } from "@/lib/market-portal";
import { optOutsFromForm, type MaintenanceKind } from "@/lib/maintenance-sections";
import { mustSetPassword } from "@/lib/password-gate";
import { dbPublicError } from "@/lib/public-error";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { isUuid, parseVendorPortal, type PortalResult } from "@/lib/vendor-portal";

export async function saveOwnedMaintenanceOptOuts(formData: FormData): Promise<PortalResult> {
  const kindRaw = String(formData.get("kind") ?? "");
  const id = String(formData.get("listing_id") ?? "");
  if (kindRaw !== "vendor" && kindRaw !== "market") return { error: "That listing is missing." };
  const kind: MaintenanceKind = kindRaw;
  if (!isUuid(id)) return { error: kind === "vendor" ? "That stall is missing." : "That market is missing." };

  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user) return { error: "Sign in first." };
  if (mustSetPassword(user.app_metadata)) return { error: "Set a password first." };

  const sections = optOutsFromForm(
    kind,
    formData.getAll("maintenance_opt_outs").map((value) => String(value)),
  );
  if (sections === "bad") return { error: "That section is not on this page." };

  const { error } = await supabase.rpc("save_owned_maintenance_opt_outs", {
    p_kind: kind,
    p_id: id,
    p_sections: sections,
  });
  if (error) {
    if (error.code === "42501") {
      return { error: kind === "vendor" ? "That stall is not yours." : "That market is not yours." };
    }
    return { error: dbPublicError(error, "Could not save those updates.") };
  }

  if (kind === "vendor") {
    const { data } = await supabase.rpc("my_vendor_portal");
    const listing = parseVendorPortal(data).find((row) => row.id === id);
    if (listing) {
      revalidatePublishedDirectory([
        `/vendors/${listing.slug}`,
        "/vendor",
        `/vendor/${listing.id}`,
        ...listing.stalls.map((stall) => `/markets/${stall.market_slug}`),
      ]);
    }
  } else {
    const { data } = await supabase.rpc("my_market_portal");
    const listing = parseMarketPortal(data).find((row) => row.id === id);
    if (listing) {
      revalidatePublishedDirectory([
        `/markets/${listing.slug}`,
        "/market",
        `/market/${listing.id}`,
        ...listing.stalls.map((stall) => `/vendors/${stall.vendor_slug}`),
      ]);
    }
  }
  return { error: null, message: "Saved." };
}
