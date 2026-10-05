/** Google consent names this host. Hosted Auth must use it, never *.supabase.co. */
export const GOOGLE_OAUTH_CALLBACK = "https://auth.marketregular.com/auth/v1/callback";

const HOSTED_AUTHORIZE_HOSTS = new Set([
  "pxsndrlptceafhsxfays.supabase.co",
  "auth.marketregular.com",
]);

const AUTHORIZE_PATH = "/auth/v1/authorize";
const CALLBACK_PATH = "/auth/v1/callback";

export function isLocalSupabaseHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

function parseUrl(raw: string) {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** Authorize URL the browser got from Supabase. Rejects anything we would not fetch. */
export function isAllowedAuthorizeUrl(
  raw: string,
  options?: { allowLoopback?: boolean },
) {
  const url = parseUrl(raw);
  if (!url || url.username || url.password || url.pathname !== AUTHORIZE_PATH) return false;
  if (isLocalSupabaseHost(url.hostname)) {
    const allowLoopback = options?.allowLoopback ?? process.env.NODE_ENV !== "production";
    if (!allowLoopback) return false;
    return url.protocol === "http:" || url.protocol === "https:";
  }
  return (
    url.protocol === "https:" &&
    url.port === "" &&
    HOSTED_AUTHORIZE_HOSTS.has(url.hostname)
  );
}

function callbackAllowed(authorizeHost: string, redirectUri: string, allowLoopback = true) {
  const redirect = parseUrl(redirectUri);
  if (!redirect || redirect.username || redirect.password || redirect.pathname !== CALLBACK_PATH) {
    return false;
  }
  if (isLocalSupabaseHost(authorizeHost)) {
    if (!allowLoopback) return false;
    return (
      (redirect.protocol === "http:" || redirect.protocol === "https:") &&
      isLocalSupabaseHost(redirect.hostname)
    );
  }
  return redirectUri === GOOGLE_OAUTH_CALLBACK;
}

/**
 * Google URL to open, or null when the consent screen would name another host.
 * `locationHeader` is the authorize response's Location, absolute or relative.
 */
export function googleConsentUrl(
  authorizeUrl: string,
  locationHeader: string | null,
  options?: { allowLoopback?: boolean },
) {
  if (!locationHeader || !isAllowedAuthorizeUrl(authorizeUrl, options)) return null;
  const authorize = parseUrl(authorizeUrl);
  if (!authorize) return null;
  let location: URL;
  try {
    location = new URL(locationHeader, authorize);
  } catch {
    return null;
  }
  if (
    location.protocol !== "https:" ||
    location.hostname !== "accounts.google.com" ||
    location.username ||
    location.password
  ) {
    return null;
  }
  const redirectUri = location.searchParams.get("redirect_uri");
  if (!redirectUri || !callbackAllowed(authorize.hostname, redirectUri, options?.allowLoopback)) return null;
  return location.toString();
}
