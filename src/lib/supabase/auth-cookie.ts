/** True for a persisted Supabase session cookie, not the PKCE verifier. */
export function cookieLooksLikeSupabaseAuth(name: string) {
  return name.includes("auth-token") && !name.includes("code-verifier");
}

export function documentHasAuthCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0];
    return cookieLooksLikeSupabaseAuth(name);
  });
}
