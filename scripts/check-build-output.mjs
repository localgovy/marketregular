import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const appDir = join(process.cwd(), ".next/server/app");
const HTML_BUDGET = 250_000;
const APP_BUDGET = 2.2 * 1024 * 1024 * 1024;

function walk(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, visit);
    else visit(path, entry.name);
  }
}

let appBytes = 0;
let inlined = null;

walk(appDir, (path, name) => {
  const size = statSync(path).size;
  appBytes += size;
  if (!inlined && name.endsWith(".rsc") && size < 2_000_000) {
    const text = readFileSync(path, "utf8");
    if (text.includes("@layer properties")) inlined = path;
  }
});

const vendorsDir = join(appDir, "vendors");
let vendorHtmlBytes = 0;
let vendorHtmlCount = 0;
try {
  for (const name of readdirSync(vendorsDir)) {
    if (!name.endsWith(".html")) continue;
    vendorHtmlBytes += statSync(join(vendorsDir, name)).size;
    vendorHtmlCount += 1;
  }
} catch {
  // A build with no prerendered stalls still has to stay under the app budget.
}

const problems = [];
if (inlined) {
  problems.push(`Inlined CSS is back in ${inlined}. Leave experimental.inlineCss off.`);
}
if (vendorHtmlCount > 0) {
  const average = vendorHtmlBytes / vendorHtmlCount;
  if (average > HTML_BUDGET) {
    problems.push(
      `Average vendor HTML is ${Math.round(average / 1000)}KB. The budget is ${Math.round(HTML_BUDGET / 1000)}KB.`,
    );
  }
}
if (appBytes > APP_BUDGET) {
  problems.push(
    `.next/server/app is ${(appBytes / 1024 / 1024 / 1024).toFixed(2)}GB. The budget is 2.2GB.`,
  );
}

if (problems.length) {
  console.error("Build output is over the usage budget.\n");
  for (const problem of problems) console.error(problem);
  process.exit(1);
}

console.log(
  `Build output ok: app ${(appBytes / 1024 / 1024).toFixed(0)}MB, vendor HTML ${
    vendorHtmlCount ? Math.round(vendorHtmlBytes / vendorHtmlCount / 1000) : 0
  }KB average.`,
);
