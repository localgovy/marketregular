export const GOOGLE_CALLBACK_PATH = "/auth/google/callback";
const STORAGE_KEY = "mr-google-oauth";

export function googleRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, "")}${GOOGLE_CALLBACK_PATH}`;
}

export function isSiteOwnedOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith("marketregular.com");
  } catch {
    return false;
  }
}

export async function resolveGoogleClientId() {
  const fromEnv = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const res = await fetch(`${url}/auth/v1/authorize?provider=google`, {
    method: "GET",
    redirect: "manual",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const location = res.headers.get("location");
  if (!location) return null;
  try {
    return new URL(location).searchParams.get("client_id");
  } catch {
    return null;
  }
}

export function randomOAuthValue() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function buildGoogleAuthUrl({
  clientId,
  redirectUri,
  state,
  nonce,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "id_token");
  url.searchParams.set("response_mode", "fragment");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export type GoogleOAuthHandoff = {
  state: string;
  nonce: string;
  next: string;
};

export function storeGoogleOAuthHandoff(value: GoogleOAuthHandoff) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function takeGoogleOAuthHandoff(): GoogleOAuthHandoff | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleOAuthHandoff>;
    if (
      typeof parsed.state !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.next !== "string"
    ) {
      return null;
    }
    return { state: parsed.state, nonce: parsed.nonce, next: parsed.next };
  } catch {
    return null;
  }
}
