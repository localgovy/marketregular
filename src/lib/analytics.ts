import { SITE_URL } from "@/lib/constants";

export const OAUTH_HASH_STORAGE_KEY = "mr-oauth-hash";

const REDACT_PARAMS = [
  "code",
  "token_hash",
  "id_token",
  "access_token",
  "refresh_token",
] as const;

export function isAuthAnalyticsPath(pathname: string) {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

/** Runs before hydration so the OAuth fragment is gone before analytics scripts. */
export const OAUTH_HASH_SCRUB_SCRIPT = `(function(){var p=location.pathname;if(p!=="/auth"&&p.indexOf("/auth/")!==0)return;var h=location.hash;if(!h||h==="#")return;try{sessionStorage.setItem(${JSON.stringify(OAUTH_HASH_STORAGE_KEY)},h);}catch(e){}history.replaceState(null,"",p+location.search);})();`;

export function sanitizeAnalyticsUrl(raw: string) {
  try {
    const url = new URL(raw, SITE_URL);
    if (isAuthAnalyticsPath(url.pathname)) return null;
    url.hash = "";
    url.username = "";
    url.password = "";
    for (const key of REDACT_PARAMS) url.searchParams.delete(key);
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
