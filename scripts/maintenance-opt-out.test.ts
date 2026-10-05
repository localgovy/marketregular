import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMarketPortal } from "../src/lib/market-portal.ts";
import {
  groupMaintenanceOptOuts,
  maintenanceBlockMessage,
  nextMaintenanceOptOuts,
  optOutsFromForm,
  readOptOuts,
  touchedMarketSections,
  touchedVendorSections,
  type MarketMaintenanceFields,
  type VendorMaintenanceFields,
} from "../src/lib/maintenance-sections.ts";
import { parseVendorPortal } from "../src/lib/vendor-portal.ts";

const blankVendor: VendorMaintenanceFields = {
  about: null,
  logo_url: null,
  phone: null,
  email: null,
  website: null,
  instagram: null,
  tiktok: null,
  facebook: null,
  tags: [],
};

const blankMarket: MarketMaintenanceFields = {
  ...blankVendor,
  address: "725 Logan Ave",
  city: "Toronto",
  province: "ON",
  postal_code: "M4J 1M3",
  lat: 43.67,
  lng: -79.33,
};

test("opt-out keys stay inside the listing they belong to", () => {
  assert.deepEqual(optOutsFromForm("vendor", []), []);
  assert.deepEqual(optOutsFromForm("vendor", ["logo", "menu"]), ["logo", "menu"]);
  assert.equal(optOutsFromForm("vendor", ["about", "about"]), "bad");
  assert.equal(optOutsFromForm("vendor", ["place"]), "bad");
  assert.equal(optOutsFromForm("vendor", ["nope"]), "bad");
  assert.equal(optOutsFromForm("market", ["menu"]), "bad");
  assert.deepEqual(optOutsFromForm("market", ["hours", "place"]), ["hours", "place"]);
  assert.deepEqual(readOptOuts("vendor", ["about", "nope", "about", "menu"]), ["about", "menu"]);
  assert.deepEqual(readOptOuts("market", ["menu", "hours"]), ["hours"]);
  assert.deepEqual(readOptOuts("vendor", null), []);
});

test("a patch names only the sections whose fields changed", () => {
  assert.deepEqual(touchedVendorSections(blankVendor, { ...blankVendor, about: "" }), []);
  assert.deepEqual(touchedVendorSections(blankVendor, { ...blankVendor, about: "Peaches" }), ["about"]);
  assert.deepEqual(touchedVendorSections(blankVendor, { ...blankVendor, phone: "416-555-0100" }), ["contact"]);
  assert.deepEqual(
    touchedVendorSections(blankVendor, { ...blankVendor, instagram: "https://www.instagram.com/river" }),
    ["links"],
  );
  assert.deepEqual(touchedVendorSections(blankVendor, { ...blankVendor, tags: ["produce"] }), ["tags"]);
  assert.deepEqual(
    touchedVendorSections({ ...blankVendor, tags: ["produce", "dairy"] }, { ...blankVendor, tags: ["dairy", "produce"] }),
    ["tags"],
  );
  assert.deepEqual(touchedMarketSections(blankMarket, blankMarket), []);
  assert.deepEqual(touchedMarketSections(blankMarket, { ...blankMarket, lat: 43.68 }), ["place"]);
  assert.deepEqual(
    touchedMarketSections(blankMarket, { ...blankMarket, about: "Saturday", city: "East York" }),
    ["about", "place"],
  );
});

test("blocked sections are named for admin, and listings group under each section", () => {
  assert.equal(
    maintenanceBlockMessage([{ labels: ["About"], noun: "stall" }]),
    "About stays with this stall. Check Save these sections anyway to change it.",
  );
  assert.equal(
    maintenanceBlockMessage([{ labels: ["About", "Menu"], noun: "stall" }]),
    "About and Menu stay with this stall. Check Save these sections anyway to change them.",
  );
  assert.equal(
    maintenanceBlockMessage([
      { labels: ["Markets"], noun: "stall" },
      { labels: ["Stalls"], noun: "market" },
    ]),
    "Markets stays with this stall. Stalls stays with this market. Check Save these sections anyway to change them.",
  );
  assert.equal(maintenanceBlockMessage([{ labels: [], noun: "market" }]), null);

  const groups = groupMaintenanceOptOuts(
    [
      { id: "v2", name: "Zebra Honey", maintenance_opt_outs: ["menu", "about"] },
      { id: "v1", name: "River Fruit", maintenance_opt_outs: ["about"] },
    ],
    [{ id: "m1", name: "Withrow", maintenance_opt_outs: ["about", "hours"] }],
  );
  const about = groups.find((group) => group.key === "about");
  const menu = groups.find((group) => group.key === "menu");
  const hours = groups.find((group) => group.key === "hours");
  const logo = groups.find((group) => group.key === "logo");
  assert.deepEqual(about?.vendors.map((row) => row.name), ["River Fruit", "Zebra Honey"]);
  assert.deepEqual(about?.markets.map((row) => row.name), ["Withrow"]);
  assert.deepEqual(menu?.vendors.map((row) => row.name), ["Zebra Honey"]);
  assert.deepEqual(menu?.markets, []);
  assert.deepEqual(hours?.markets.map((row) => row.name), ["Withrow"]);
  assert.deepEqual(hours?.vendors, []);
  assert.deepEqual(logo?.vendors, []);
  assert.deepEqual(logo?.markets, []);
});

test("portal payloads keep known opt-outs and drop the rest", () => {
  const vendors = parseVendorPortal([
    {
      id: "11111111-1111-4111-8111-111111111111",
      slug: "river-fruit",
      name: "River Fruit",
      maintenance_opt_outs: ["menu", "place", "menu"],
    },
  ]);
  assert.deepEqual(vendors[0]?.maintenance_opt_outs, ["menu"]);

  const markets = parseMarketPortal([
    {
      id: "55555555-5555-4555-8555-555555555555",
      slug: "withrow",
      name: "Withrow",
      address: "725 Logan Ave",
      city: "Toronto",
      province: "ON",
      maintenance_opt_outs: ["hours", "menu", "hours"],
    },
  ]);
  assert.deepEqual(markets[0]?.maintenance_opt_outs, ["hours"]);
});

test("a stale desk form does not wipe opt-outs the owner just saved", () => {
  assert.deepEqual(
    nextMaintenanceOptOuts({ current: ["menu"], loaded: ["menu"], submitted: ["menu", "about"], override: false }),
    { write: ["menu", "about"] },
  );
  assert.deepEqual(
    nextMaintenanceOptOuts({ current: ["menu"], loaded: [], submitted: [], override: false }),
    { keep: true },
  );
  assert.deepEqual(
    nextMaintenanceOptOuts({ current: ["menu"], loaded: [], submitted: ["logo"], override: false }),
    { reload: true },
  );
  assert.deepEqual(
    nextMaintenanceOptOuts({ current: ["menu"], loaded: [], submitted: ["logo"], override: true }),
    { write: ["logo"] },
  );
  assert.deepEqual(
    nextMaintenanceOptOuts({ current: ["menu"], loaded: null, submitted: [], override: false }),
    { keep: true },
  );
});
