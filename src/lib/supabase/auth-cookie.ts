/** True for a persisted Supabase session cookie, not the PKCE verifier. */
export function cookieLooksLikeSupabaseAuth(name: string) {
  return name.includes("auth-token") && !name.includes("code-verifier");
}
