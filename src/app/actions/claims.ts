"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitClaim(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "Supabase is not configured yet." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to claim a listing." };

  const target_type = String(formData.get("target_type")) as "market" | "vendor";
  const target_id = String(formData.get("target_id"));
  const evidence = String(formData.get("evidence") ?? "").trim();
  if (evidence.length < 20) {
    return { error: "Tell us how we can verify you run this stall or market." };
  }

  const { error } = await supabase.from("claim_requests").insert({
    user_id: user.id,
    target_type,
    target_id,
    evidence,
    status: "pending",
  });
  if (error) return { error: error.message };
  revalidatePath("/account");
  return { error: null, message: "Claim submitted. We'll email you after a review." };
}
