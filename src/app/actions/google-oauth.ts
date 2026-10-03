"use server";

import { googleConsentUrl, isAllowedAuthorizeUrl } from "@/lib/google-oauth-host";

const UNAVAILABLE = "Google sign-in is unavailable.";

/** Opens Google only when the consent screen will name auth.marketregular.com. */
export async function guardGoogleAuthorize(authorizeUrl: string) {
  if (!isAllowedAuthorizeUrl(authorizeUrl)) return { error: UNAVAILABLE };
  try {
    const response = await fetch(authorizeUrl, { redirect: "manual" });
    const location = response.headers.get("location");
    const url = googleConsentUrl(authorizeUrl, location);
    if (!url) return { error: UNAVAILABLE };
    return { url };
  } catch {
    return { error: UNAVAILABLE };
  }
}
