import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseCookieOptions, supabaseUrl } from "@/lib/supabase/env";

export function createBrowserSupabaseClient() {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return null;
  return createBrowserClient(url, key, {
    auth: { detectSessionInUrl: false },
    cookieOptions: supabaseCookieOptions(),
  });
}
