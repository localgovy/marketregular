import assert from "node:assert/strict";
import { test } from "node:test";
import { FIND_PAGES } from "../src/data/find-pages.ts";
import { CATEGORIES, DAY_SLUGS } from "../src/lib/landing.ts";
import {
  isRobotsDisallowed,
  ROBOTS_DISALLOW,
  robotsRuleMatches,
} from "../src/lib/robots-policy.ts";
import { publicSitemapEntries } from "../src/lib/sitemap-entries.ts";

const publicPaths = [
  "/",
  "/markets",
  "/markets/wychwood-barns",
  "/markets/day",
  "/markets/day/sunday",
  "/markets/open-today",
  "/markets/tag/produce",
  "/vendors",
  "/vendors/hooked",
  "/products",
  "/find/bread-toronto",
  "/events",
  "/feed",
  "/about",
  "/blog",
  "/blog/this-weekend-at-the-market",
  "/privacy",
  "/terms",
  "/login",
  "/signup",
];

const privatePaths = [
  "/admin",
  "/admin/",
  "/admin/markets",
  "/account",
  "/account/password",
  "/account?next=/saved",
  "/vendor",
  "/vendor/",
  "/vendor/abc-uuid",
  "/vendor?error=1",
  "/market",
  "/market/",
  "/market/abc-uuid",
  "/market?request=1",
  "/auth/callback",
  "/auth/confirm",
  "/onboarding",
  "/onboarding?next=/vendor",
  "/saved",
  "/kept",
];

test("public market and stall paths are crawlable", () => {
  for (const path of publicPaths) {
    assert.equal(isRobotsDisallowed(path), false, path);
  }
});

test("private portal paths stay disallowed", () => {
  for (const path of privatePaths) {
    assert.equal(isRobotsDisallowed(path), true, path);
  }
});

test("Disallow: /vendor does not appear as a prefix rule", () => {
  assert.equal(ROBOTS_DISALLOW.includes("/vendor"), false);
  assert.equal(ROBOTS_DISALLOW.includes("/market"), false);
  assert.ok(ROBOTS_DISALLOW.includes("/vendor$"));
  assert.ok(ROBOTS_DISALLOW.includes("/vendor/"));
  assert.ok(ROBOTS_DISALLOW.includes("/market$"));
  assert.ok(ROBOTS_DISALLOW.includes("/market/"));
});

test("the old /vendor prefix would have blocked stall pages", () => {
  assert.equal(robotsRuleMatches("/vendor", "/vendors/hooked"), true);
  assert.equal(robotsRuleMatches("/vendor$", "/vendors/hooked"), false);
  assert.equal(robotsRuleMatches("/vendor/", "/vendors/hooked"), false);
  assert.equal(robotsRuleMatches("/market", "/markets/wychwood-barns"), true);
  assert.equal(robotsRuleMatches("/market$", "/markets/wychwood-barns"), false);
});

test("sitemap listings are public paths robots allows", () => {
  const entries = publicSitemapEntries({
    markets: [{ slug: "wychwood-barns", updated_at: "2026-10-01T00:00:00.000Z" }],
    vendors: [{ slug: "hooked", updated_at: "2026-09-01T00:00:00.000Z" }],
    posts: [{ slug: "in-season", date: "2026-09-15" }],
  });
  const paths = entries.map((entry) => entry.path);
  assert.ok(paths.includes("/"));
  assert.ok(paths.includes("/markets"));
  assert.ok(paths.includes("/markets/wychwood-barns"));
  assert.ok(paths.includes("/vendors/hooked"));
  assert.ok(paths.includes("/blog/in-season"));
  assert.equal(paths.includes("/vendors"), false);
  assert.equal(paths.includes("/vendor"), false);
  assert.equal(paths.includes("/market"), false);
  assert.equal(paths.includes("/admin"), false);
  for (const path of paths) {
    assert.equal(isRobotsDisallowed(path), false, path);
  }
  for (const page of FIND_PAGES) {
    assert.ok(paths.includes(`/find/${page.slug}`), page.slug);
  }
  for (const day of DAY_SLUGS) {
    assert.ok(paths.includes(`/markets/day/${day}`), day);
  }
  for (const category of CATEGORIES) {
    assert.ok(paths.includes(`/markets/tag/${category.tag}`), category.tag);
  }
});

test("a blocked path never survives sitemap filtering", () => {
  const entries = publicSitemapEntries({
    markets: [{ slug: "wychwood-barns" }, { slug: "" }],
    vendors: [{ slug: "hooked" }, { slug: "" }],
    posts: [],
  });
  assert.equal(
    entries.some((entry) => isRobotsDisallowed(entry.path)),
    false,
  );
});
