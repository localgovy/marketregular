import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { supabase: null, user: null, error: "supabase" as const };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const allowList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isAllowListed = user.email
    ? allowList.includes(user.email.toLowerCase())
    : false;

  if (profile?.role !== "admin" && isAllowListed) {
    const service = createServiceClient();
    if (service) {
      await service.from("profiles").update({ role: "admin" }).eq("id", user.id);
    } else {
      await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
    }
  } else if (profile?.role !== "admin" && !isAllowListed) {
    redirect("/");
  }

  return { supabase, user, error: null };
}
