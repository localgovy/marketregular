import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Files that must keep the one-read prerender. Deleting one of these sends the build back to a query per listing. */
const FILE_MARKS = [
  ["next.config.ts", /staticGenerationMaxConcurrency:\s*1/],
  ["src/app/markets/[slug]/page.tsx", /await requireBuildSnapshot\(\)/],
  ["src/app/vendors/[slug]/page.tsx", /await requireBuildSnapshot\(\)/],
  ["src/app/preview/home-1/page.tsx", /export const dynamic = "force-dynamic"/],
  ["src/lib/listing-claimed.ts", /requireBuildSnapshot\(\)/],
  ["src/lib/data/product-search.ts", /requireBuildSnapshot\(\)/],
];

const CATALOG_FUNCTIONS = [
  "getPublishedDirectory",
  "getListingContact",
  "getMarketBySlug",
  "getVendorBySlug",
];

export function functionBody(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  if (start < 0) return "";
  const rest = source.slice(start + marker.length);
  const end = rest.search(/\n(?:export |function |const )/);
  return end < 0 ? rest : rest.slice(0, end);
}

export function buildSnapshotProblemsIn(read) {
  const problems = [];
  for (const [file, pattern] of FILE_MARKS) {
    const source = read(file);
    if (typeof source !== "string") {
      problems.push(`${file} is missing`);
      continue;
    }
    if (!pattern.test(source)) {
      problems.push(`${file} no longer keeps the one-read prerender`);
    }
  }
  const catalog = read("src/lib/data/catalog.ts");
  if (typeof catalog !== "string") {
    problems.push("src/lib/data/catalog.ts is missing");
    return problems;
  }
  for (const name of CATALOG_FUNCTIONS) {
    const body = functionBody(catalog, name);
    if (!body.includes("requireBuildSnapshot(")) {
      problems.push(`${name} can prerender by querying Supabase once per listing`);
    }
  }
  return problems;
}

export function findBuildSnapshotProblems() {
  return buildSnapshotProblemsIn((file) => {
    try {
      return readFileSync(join(root, file), "utf8");
    } catch {
      return null;
    }
  });
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const problems = findBuildSnapshotProblems();
  if (problems.length) {
    console.error(
      "The production build must keep the directory snapshot. Without it, each listing page queries Supabase on its own and the deploy takes several minutes.\n",
    );
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
}
