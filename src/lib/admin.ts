import { createServiceClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const session = await createServerSupabaseClient();
  if (!session) {
    return { supabase: null, user: null, error: "supabase" as const };
  }
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect("/");

  const { data: isAdmin, error } = await session.rpc("is_admin");
  if (error || isAdmin !== true) redirect("/");

  const supabase = createServiceClient();
  if (!supabase) redirect("/");
  return { supabase, user, error: null };
}
