import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; proxy.ts handles the refresh.
        }
      },
    },
  });
}

/**
 * Cookie clients skip session load until getUser/getSession. Table queries
 * issued before that run as anon and look empty (saves have no anon SELECT).
 */
export async function createAuthedServerClient(): Promise<
  | { supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>; user: User }
  | { supabase: null; user: null }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { supabase: null, user: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null };
  return { supabase, user };
}
