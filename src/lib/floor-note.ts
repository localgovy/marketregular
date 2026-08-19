import type { FloorItem } from "@/types/database";

export function encodeFloorBody(text: string, tags: string[], vendorSlug?: string) {
  const bits = [text.trim()];
  if (tags.length) bits.push(tags.map((t) => `#${t.replaceAll(/\s+/g, "-")}`).join(" "));
  if (vendorSlug) bits.push(`@${vendorSlug}`);
  return bits.join("\n");
}

export function decodeFloorBody(raw: string) {
  const tags: string[] = [];
  let vendorSlug: string | null = null;
  const kept: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (/^@[\w-]+$/.test(trimmed)) {
      vendorSlug = trimmed.slice(1);
      continue;
    }
    const stripped = trimmed
      .replace(/#([a-z0-9-]+)/gi, (_, tag: string) => {
        tags.push(tag.toLowerCase());
        return "";
      })
      .replace(/\s+/g, " ")
      .trim();
    if (stripped) kept.push(stripped);
  }
  return {
    body: kept.join(" ").trim() || raw.trim(),
    tags: [...new Set(tags)],
    vendorSlug,
  };
}

export function scrapStyle(id: string) {
  let n = 0;
  for (const ch of id) n = (n + ch.charCodeAt(0) * 17) % 97;
  const papers = [
    "bg-[#fff6e4]",
    "bg-[#fdeee4]",
    "bg-[#eef6e8]",
    "bg-[#f8f1dc]",
    "bg-[#f6e8ea]",
  ];
  const tilts = [
    "-rotate-[0.7deg]",
    "rotate-[0.55deg]",
    "-rotate-[0.35deg]",
    "rotate-[0.8deg]",
    "-rotate-[0.9deg]",
  ];
  return `${papers[n % papers.length]} ${tilts[n % tilts.length]}`;
}

export function floorKicker(item: Pick<FloorItem, "kind" | "id" | "rating">) {
  if (item.kind === "review") {
    return item.rating != null ? `Review · ${item.rating} out of 5` : "Review";
  }
  return "Note from the market";
}

export const NOTE_PROMPTS = [
  "What should the next shopper know?",
];
