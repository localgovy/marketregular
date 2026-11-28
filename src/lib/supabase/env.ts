/** Public project URL and publishable key. The env names stay ANON_KEY.
 *  Server also accepts non-public aliases.
 *  The secret key lives in `admin.ts` so it cannot follow this module into the client bundle. */
export function supabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
}

export function supabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    ""
  );
}

/** Session cookies are JS-readable by design. Production still needs Secure. */
export function supabaseCookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
