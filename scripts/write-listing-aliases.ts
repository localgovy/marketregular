import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveListingRedirects } from "../src/lib/live-listing-redirects.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "src/data/listing-aliases.generated.json");

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key || process.env[key] != null) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function render(rows: { source: string; destination: string }[]) {
  return `${JSON.stringify(rows, null, 2)}\n`;
}

loadEnvFile(join(root, ".env"));
loadEnvFile(join(root, ".env.local"));

const rows = await fetchLiveListingRedirects();
const next = render(rows);
const current = existsSync(out) ? readFileSync(out, "utf8") : "";
if (current !== next) writeFileSync(out, next);
if (!rows.length) {
  console.warn("listing aliases: none merged (table empty or unread)");
} else {
  console.log(`listing aliases: ${rows.length} merged`);
}
