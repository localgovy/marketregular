import assert from "node:assert/strict";
import { test } from "node:test";
import {
  groupMenuItems,
  MENU_SECTION_CAP,
  menuSectionsFromItems,
  moveMenuSectionList,
  NEW_MENU_SECTION,
  parseMenuSectionForm,
  publishedMenuSelectMissingSections,
  renameMenuSectionList,
} from "../src/lib/menu-sections.ts";
import type { MenuItem } from "../src/types/database.ts";

function item(
  name: string,
  section: string | null = null,
  order: number | null = null,
  id = name,
): MenuItem {
  return {
    id,
    vendor_id: "vendor",
    name,
    description: null,
    price_cents: null,
    season: null,
    dietary: [],
    menu_section: section,
    menu_section_order: order,
  };
}

test("a missing section column is recognized so reads can stay flat", () => {
  assert.equal(
    publishedMenuSelectMissingSections({
      code: "42703",
      message: "column published_menus.menu_section does not exist",
    }),
    true,
  );
  assert.equal(
    publishedMenuSelectMissingSections({
      code: "PGRST204",
      message: "Could not find the 'menu_section' column of 'published_menus' in the schema cache",
    }),
    true,
  );
  assert.equal(
    publishedMenuSelectMissingSections({
      code: "42703",
      message: "column published_menus.product_category does not exist",
    }),
    false,
  );
});

test("a menu with no section stays ungrouped", () => {
  assert.equal(groupMenuItems([item("Rye"), item("Honey")]), null);
});

test("sectioned items group by order then name, unsectioned last", () => {
  const groups = groupMenuItems([
    item("Walnut loaf", "Breads", 1, "a"),
    item("Rye", "Breads", 1, "b"),
    item("Jam", null, null, "c"),
    item("Butter tart", "Sweets", 2, "d"),
    item("Pie", "Sweets", 2, "e"),
  ]);
  assert.ok(groups);
  assert.deepEqual(
    groups.map((group) => [group.heading, group.items.map((row) => row.name)]),
    [
      ["Breads", ["Rye", "Walnut loaf"]],
      ["Sweets", ["Butter tart", "Pie"]],
      [null, ["Jam"]],
    ],
  );
});

test("null section order sorts after numbered groups", () => {
  const groups = groupMenuItems([
    item("Tea", "Drinks", null, "a"),
    item("Loaf", "Breads", 1, "b"),
  ]);
  assert.deepEqual(
    groups?.map((group) => group.heading),
    ["Breads", "Drinks"],
  );
});

test("existing sections are collected in display order", () => {
  const sections = menuSectionsFromItems([
    item("Pie", "Sweets", 2),
    item("Rye", "Breads", 1),
    item("Jam", null, null),
  ]);
  assert.deepEqual(
    sections.map((section) => section.name),
    ["Breads", "Sweets"],
  );
});

test("a new section is rejected at the cap", () => {
  const existing = Array.from({ length: MENU_SECTION_CAP }, (_, i) => ({
    name: `Section ${i + 1}`,
    order: i + 1,
  }));
  const form = new FormData();
  form.set("menu_section_choice", NEW_MENU_SECTION);
  form.set("menu_section_new", "Extras");
  const parsed = parseMenuSectionForm(form, existing);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /at most 5 sections/);
});

test("the only item in a section can keep that name", () => {
  const form = new FormData();
  form.set("menu_section_choice", "Breads");
  const parsed = parseMenuSectionForm(form, [], { name: "Breads", order: 1 });
  assert.deepEqual(parsed, { ok: true, section: "Breads", order: 1 });
});

test("a new section takes the first open order", () => {
  const form = new FormData();
  form.set("menu_section_choice", NEW_MENU_SECTION);
  form.set("menu_section_new", "Drinks");
  const parsed = parseMenuSectionForm(form, [
    { name: "Breads", order: 1 },
    { name: "Sweets", order: 3 },
  ]);
  assert.deepEqual(parsed, { ok: true, section: "Drinks", order: 2 });
});

test("renaming onto another section is rejected", () => {
  const renamed = renameMenuSectionList(
    [
      { name: "Breads", order: 1 },
      { name: "Sweets", order: 2 },
    ],
    "Breads",
    "sweets",
  );
  assert.equal(renamed.ok, false);
  if (!renamed.ok) assert.equal(renamed.error, "That name is already a section.");
});

test("new section names reuse an existing spelling", () => {
  const form = new FormData();
  form.set("menu_section_choice", NEW_MENU_SECTION);
  form.set("menu_section_new", " breads ");
  const parsed = parseMenuSectionForm(form, [{ name: "Breads", order: 1 }]);
  assert.deepEqual(parsed, { ok: true, section: "Breads", order: 1 });
});

test("rename and reorder keep the payload aligned", () => {
  const sections = [
    { name: "Breads", order: 1 },
    { name: "Sweets", order: 2 },
  ];
  const renamed = renameMenuSectionList(sections, "Breads", "Loaves");
  assert.ok(renamed.ok);
  if (renamed.ok) {
    assert.deepEqual(renamed.sections, [
      { from: "Breads", name: "Loaves", order: 1 },
      { from: "Sweets", name: "Sweets", order: 2 },
    ]);
  }
  const moved = moveMenuSectionList(sections, "Sweets", "up");
  assert.ok(moved.ok);
  if (moved.ok) {
    assert.deepEqual(moved.sections.map((row) => row.name), ["Sweets", "Breads"]);
  }
});
