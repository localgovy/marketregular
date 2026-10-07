import type { MenuItem } from "@/types/database";

export const MENU_SECTION_CAP = 5;
export const MENU_SECTION_NAME_MAX = 40;
export const NEW_MENU_SECTION = "__new__";

export type MenuSectionRef = {
  name: string;
  order: number | null;
};

export type MenuSectionPayload = {
  from: string;
  name: string;
  order: number;
};

export type MenuSectionGroup = {
  heading: string | null;
  order: number | null;
  items: MenuItem[];
};

export function normalizeMenuSectionName(raw: string) {
  return raw.trim();
}

export function menuSectionsFromItems(
  items: Array<{ menu_section?: string | null; menu_section_order?: number | null }>,
): MenuSectionRef[] {
  const byName = new Map<string, number | null>();
  for (const item of items) {
    const name = item.menu_section?.trim();
    if (!name) continue;
    const order =
      typeof item.menu_section_order === "number" && Number.isInteger(item.menu_section_order)
        ? item.menu_section_order
        : null;
    const current = byName.get(name);
    if (current === undefined) {
      byName.set(name, order);
      continue;
    }
    if (current == null && order != null) byName.set(name, order);
    else if (current != null && order != null && order < current) byName.set(name, order);
  }
  return [...byName.entries()]
    .map(([name, order]) => ({ name, order }))
    .sort((a, b) => compareSections(a, b));
}

function compareSections(a: MenuSectionRef, b: MenuSectionRef) {
  if (a.order == null && b.order == null) return a.name.localeCompare(b.name);
  if (a.order == null) return 1;
  if (b.order == null) return -1;
  if (a.order !== b.order) return a.order - b.order;
  return a.name.localeCompare(b.name);
}

function byNameThenId(a: MenuItem, b: MenuItem) {
  const names = a.name.localeCompare(b.name);
  if (names !== 0) return names;
  return a.id.localeCompare(b.id);
}

/** Groups a stall menu. Null means every item is unsectioned — keep the flat list. */
export function groupMenuItems(items: MenuItem[]): MenuSectionGroup[] | null {
  if (!items.some((item) => item.menu_section?.trim())) return null;

  const buckets = new Map<string, MenuItem[]>();
  const orders = new Map<string, number | null>();
  const unsectioned: MenuItem[] = [];

  for (const item of items) {
    const name = item.menu_section?.trim() || null;
    if (!name) {
      unsectioned.push(item);
      continue;
    }
    const list = buckets.get(name) ?? [];
    list.push(item);
    buckets.set(name, list);
    const next = item.menu_section_order;
    const current = orders.get(name);
    if (current === undefined) {
      orders.set(name, typeof next === "number" ? next : null);
      continue;
    }
    if (current == null && typeof next === "number") orders.set(name, next);
    else if (typeof current === "number" && typeof next === "number" && next < current) {
      orders.set(name, next);
    }
  }

  const groups: MenuSectionGroup[] = [...buckets.entries()].map(([heading, grouped]) => ({
    heading,
    order: orders.get(heading) ?? null,
    items: [...grouped].sort(byNameThenId),
  }));
  groups.sort((a, b) =>
    compareSections(
      { name: a.heading ?? "", order: a.order },
      { name: b.heading ?? "", order: b.order },
    ),
  );
  if (unsectioned.length) {
    groups.push({
      heading: null,
      order: null,
      items: [...unsectioned].sort(byNameThenId),
    });
  }
  return groups;
}

export function nextMenuSectionOrder(sections: MenuSectionRef[]) {
  const max = sections.reduce((n, section) => Math.max(n, section.order ?? 0), 0);
  return Math.min(max + 1, MENU_SECTION_CAP);
}

export function parseMenuSectionForm(
  form: FormData,
  existing: MenuSectionRef[],
  current?: { name?: string | null; order?: number | null } | null,
): { ok: true; section: string | null; order: number | null } | { ok: false; error: string } {
  const choice = String(form.get("menu_section_choice") ?? "").trim();
  if (!choice) return { ok: true, section: null, order: null };

  const currentName = current?.name?.trim() || null;
  const currentOrder =
    typeof current?.order === "number" && Number.isInteger(current.order) ? current.order : null;
  const known = [...existing];
  if (currentName && !known.some((section) => section.name === currentName)) {
    known.push({ name: currentName, order: currentOrder });
  }

  if (choice === NEW_MENU_SECTION) {
    const name = normalizeMenuSectionName(String(form.get("menu_section_new") ?? ""));
    if (!name) return { ok: false, error: "Add a section name." };
    if (name.length > MENU_SECTION_NAME_MAX) {
      return { ok: false, error: "Keep the section name shorter." };
    }
    const match = known.find((section) => section.name.toLowerCase() === name.toLowerCase());
    if (match) return { ok: true, section: match.name, order: match.order };
    if (existing.length >= MENU_SECTION_CAP) {
      return { ok: false, error: "A menu can have at most 5 sections." };
    }
    return { ok: true, section: name, order: nextMenuSectionOrder(existing) };
  }

  const match = known.find((section) => section.name === choice);
  if (!match) return { ok: false, error: "That section is missing." };
  return { ok: true, section: match.name, order: match.order };
}

function numbered(sections: MenuSectionRef[]): MenuSectionPayload[] {
  return sections.map((section, index) => ({
    from: section.name,
    name: section.name,
    order: index + 1,
  }));
}

export function renameMenuSectionList(
  sections: MenuSectionRef[],
  from: string,
  nextName: string,
): { ok: true; sections: MenuSectionPayload[] } | { ok: false; error: string } {
  const current = from.trim();
  const name = normalizeMenuSectionName(nextName);
  if (!current) return { ok: false, error: "That section is missing." };
  if (!name) return { ok: false, error: "Add a section name." };
  if (name.length > MENU_SECTION_NAME_MAX) {
    return { ok: false, error: "Keep the section name shorter." };
  }
  const index = sections.findIndex((section) => section.name === current);
  if (index < 0) return { ok: false, error: "That section is missing." };
  const clash = sections.some(
    (section, i) => i !== index && section.name.toLowerCase() === name.toLowerCase(),
  );
  if (clash) return { ok: false, error: "Those sections are not allowed." };
  const next = sections.map((section, i) =>
    i === index ? { ...section, name } : section,
  );
  return {
    ok: true,
    sections: numbered(next).map((row, i) => ({
      ...row,
      from: sections[i]!.name,
      name: next[i]!.name,
    })),
  };
}

export function moveMenuSectionList(
  sections: MenuSectionRef[],
  name: string,
  direction: "up" | "down",
): { ok: true; sections: MenuSectionPayload[] } | { ok: false; error: string } {
  const index = sections.findIndex((section) => section.name === name);
  if (index < 0) return { ok: false, error: "That section is missing." };
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= sections.length) {
    return { ok: true, sections: numbered(sections) };
  }
  const next = [...sections];
  const held = next[index]!;
  next[index] = next[swap]!;
  next[swap] = held;
  return { ok: true, sections: numbered(next) };
}
