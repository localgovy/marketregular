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
    "bg-[#f8f4e8]",
    "bg-[#f3efe2]",
    "bg-[#efe8d8]",
    "bg-[#f6f1e3]",
    "bg-[#f1eadc]",
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
  let n = 0;
  for (const ch of item.id) n += ch.charCodeAt(0);
  if (item.kind === "review") {
    const lines = ["The verdict.", "Took notes.", "Would shuffle back.", "One regular's take."];
    if (item.rating === 5) return "Would cross town for this.";
    if (item.rating != null && item.rating <= 2) return "A word to the wise.";
    return lines[n % lines.length];
  }
  const lines = ["Psst.", "From the floor.", "Walked past.", "Don't sleep on this.", "Passing it on."];
  return lines[n % lines.length];
}

export const NOTE_PROMPTS = [
  "Peaches? The last loaf? A line that isn't moving?",
  "What's on the tables right now?",
  "Shout it down the aisle.",
  "What should the next person know?",
];
