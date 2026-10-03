import { GOOGLE_OAUTH_CALLBACK } from "../src/lib/google-oauth-host.ts";

const authorize = new URL("https://pxsndrlptceafhsxfays.supabase.co/auth/v1/authorize");
authorize.searchParams.set("provider", "google");
authorize.searchParams.set(
  "redirect_to",
  "https://www.marketregular.com/auth/callback",
);

const response = await fetch(authorize, { redirect: "manual" });
const location = response.headers.get("location");
if (!location) {
  console.error("authorize did not redirect");
  process.exit(1);
}

const google = new URL(location, authorize);
const redirectUri = google.searchParams.get("redirect_uri");
if (!redirectUri) {
  console.error("Google redirect is missing redirect_uri");
  process.exit(1);
}

const host = new URL(redirectUri).hostname;
console.log(host);
if (redirectUri !== GOOGLE_OAUTH_CALLBACK) {
  console.error(`expected ${GOOGLE_OAUTH_CALLBACK}`);
  process.exit(1);
}
