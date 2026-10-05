import assert from "node:assert/strict";
import test from "node:test";
import { marketPortalLetter } from "../src/lib/market-portal-mail.ts";
import {
  clipOrganizationName,
  decodePortalOrgCookie,
  portalHomePath,
  portalRequestId,
  portalSignupRecord,
  readPortalSignupIntent,
} from "../src/lib/portal-application.ts";
import { portalApplicationNotice, portalDeclineLetter } from "../src/lib/portal-application-mail.ts";
import { vendorPortalLetter } from "../src/lib/vendor-portal-mail.ts";

test("portal paths keep a listing request and drop a bad id", () => {
  assert.equal(portalHomePath("vendor", null), "/vendor");
  assert.equal(
    portalHomePath("market", "55555555-5555-4555-8555-555555555555"),
    "/market?request=55555555-5555-4555-8555-555555555555",
  );
  assert.equal(portalHomePath("vendor", "not-an-id"), "/vendor");
  assert.equal(portalRequestId(" 44444444-4444-4444-8444-444444444444 "), "44444444-4444-4444-8444-444444444444");
  assert.equal(portalRequestId("../admin"), null);
});

test("organization names are trimmed and a cookie round-trips", () => {
  assert.equal(clipOrganizationName("  Peach   Stand \n"), "Peach Stand");
  assert.equal(clipOrganizationName("   "), null);
  assert.equal(clipOrganizationName("a".repeat(200))?.length, 120);
  const encoded = encodeURIComponent("Peach Stand");
  assert.equal(decodePortalOrgCookie(encoded), "Peach Stand");
  assert.equal(decodePortalOrgCookie("%"), null);
});

test("email confirmation can rebuild the portal request without granting access", () => {
  const record = portalSignupRecord("vendor", "44444444-4444-4444-8444-444444444444", null);
  assert.deepEqual(readPortalSignupIntent({ portal_signup: record, role: "user" }), {
    kind: "vendor",
    requestId: "44444444-4444-4444-8444-444444444444",
    organizationName: null,
  });
  assert.deepEqual(readPortalSignupIntent({ portal_signup: portalSignupRecord("market", null, "Withrow") }), {
    kind: "market",
    requestId: null,
    organizationName: "Withrow",
  });
  assert.equal(readPortalSignupIntent({ portal_signup: { kind: "vendor" } }), null);
  assert.equal(readPortalSignupIntent(null), null);
});

test("assignment mail does not talk about a claim or replace the password", () => {
  const stall = vendorPortalLetter();
  const market = marketPortalLetter();
  assert.equal(stall.text.includes("Your stall is assigned"), true);
  assert.equal(market.text.includes("Your market is assigned"), true);
  assert.equal(stall.text.toLowerCase().includes("claim"), false);
  assert.equal(market.text.toLowerCase().includes("claim"), false);
  assert.equal(stall.text.includes("Password:"), false);
  assert.equal(market.text.includes("Password:"), false);
});

test("a turned-down request tells them they can ask again", () => {
  const stall = portalDeclineLetter("vendor");
  const market = portalDeclineLetter("market");
  assert.equal(stall.text.includes("couldn't assign a stall"), true);
  assert.equal(market.text.includes("couldn't assign a market"), true);
  assert.equal(stall.text.includes("send another request"), true);
  assert.equal(stall.text.toLowerCase().includes("claim"), false);
  assert.equal(stall.html.includes("<"), true);
  const notice = portalApplicationNotice({
    kind: "vendor",
    name: "Ada <script>",
    email: "ada@example.com",
    organizationName: null,
    listingName: "Peach & Rye",
    listingUrl: "https://www.marketregular.com/vendors/peach",
  });
  assert.equal(notice.html.includes("Ada &lt;script&gt;"), true);
  assert.equal(notice.html.includes("<script>"), false);
  assert.equal(notice.subject.includes("Peach & Rye"), true);
});
