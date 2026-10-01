import { createServiceClient } from "@/lib/supabase/admin";

/** PostgREST stops at 1000 rows unless the query pages. */
export async function fetchAllRows<T>(
  run: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
): Promise<T[]> {
  const page = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await run(from, from + page - 1);
    if (error) throw new Error(error.message || "Could not load that list.");
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < page) return rows;
  }
}
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
