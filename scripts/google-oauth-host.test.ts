import assert from "node:assert/strict";
import { test } from "node:test";
import { googleConsentUrl } from "../src/lib/google-oauth-host.ts";

const hosted = "https://pxsndrlptceafhsxfays.supabase.co/auth/v1/authorize?provider=google";
const custom = "https://auth.marketregular.com/auth/v1/authorize?provider=google";
const local = "http://127.0.0.1:54321/auth/v1/authorize?provider=google";
const callback = "https://auth.marketregular.com/auth/v1/callback";

function google(redirectUri: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("client_id", "test");
  return url.toString();
}

test("a hosted authorize URL may open Google only for the MarketRegular callback", () => {
  const allowed = googleConsentUrl(hosted, google(callback));
  assert.ok(allowed);
  assert.equal(new URL(allowed).searchParams.get("redirect_uri"), callback);
  assert.equal(googleConsentUrl(custom, google(callback)) !== null, true);
});

test("the project host is rejected", () => {
  const project = google(
    "https://pxsndrlptceafhsxfays.supabase.co/auth/v1/callback",
  );
  assert.equal(googleConsentUrl(hosted, project), null);
});

test("lookalike hosts are rejected", () => {
  assert.equal(
    googleConsentUrl(hosted, google("https://auth.marketregular.com.evil.com/auth/v1/callback")),
    null,
  );
  assert.equal(
    googleConsentUrl(hosted, google("https://notauth.marketregular.com/auth/v1/callback")),
    null,
  );
  assert.equal(
    googleConsentUrl(
      "https://pxsndrlptceafhsxfays.supabase.co.evil.com/auth/v1/authorize",
      google(callback),
    ),
    null,
  );
  assert.equal(
    googleConsentUrl(hosted, google("https://auth.marketregular.com/auth/v1/callback/extra")),
    null,
  );
});

test("a non-Google location is rejected", () => {
  assert.equal(googleConsentUrl(hosted, "https://evil.example/o/oauth2/auth?redirect_uri=" + callback), null);
  assert.equal(googleConsentUrl(hosted, null), null);
  assert.equal(googleConsentUrl(hosted, "/auth/v1/callback"), null);
});

test("local Supabase may use its own callback and nothing else", () => {
  const localCallback = google("http://127.0.0.1:54321/auth/v1/callback");
  assert.ok(googleConsentUrl(local, localCallback));
  assert.equal(googleConsentUrl(local, google(callback)), null);
  assert.equal(
    googleConsentUrl(local, google("https://pxsndrlptceafhsxfays.supabase.co/auth/v1/callback")),
    null,
  );
  assert.equal(googleConsentUrl(hosted, localCallback), null);
});
