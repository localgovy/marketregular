import { createRequire } from "node:module";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { loadBindings } = require("next/dist/build/swc/index.js");
const { parseModule } = require("next/dist/build/analysis/parse-module.js");
const { extractExportedConstValue } = require("next/dist/build/analysis/extract-const-value.js");
const { AppSegmentConfigSchemaKeys, parseAppSegmentConfig } = require(
  "next/dist/build/segment-config/app/app-segment-config.js",
);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Files Next reads for route segment config. `config` on proxy is included. */
const ROUTE_FILE =
  /^(page|layout|route|template|default|sitemap|robots|manifest|icon|apple-icon|opengraph-image|twitter-image)\.(tsx|ts|jsx|js)$/;

const schemaKeys = [...AppSegmentConfigSchemaKeys];
const exportedKeys = [...schemaKeys, "config"];
let bindingsReady = null;

function ensureBindings() {
  bindingsReady ??= loadBindings();
  return bindingsReady;
}

function routeFiles() {
  const files = [];
  const appDir = join(root, "src/app");
  for (const entry of readdirSync(appDir, { recursive: true, encoding: "utf8" })) {
    if (!ROUTE_FILE.test(basename(entry))) continue;
    files.push(join(appDir, entry));
  }
  for (const extra of ["src/proxy.ts", "src/middleware.ts"]) {
    const path = join(root, extra);
    try {
      if (statSync(path).isFile()) files.push(path);
    } catch {
      // Optional. Proxy replaced middleware in this app.
    }
  }
  return files;
}

export async function segmentConfigProblemsInSource(filename, source) {
  await ensureBindings();
  const ast = await parseModule(filename, source);
  if (!ast) return [`${filename}: could not parse the module`];

  const exported = {};
  const problems = [];
  for (const key of exportedKeys) {
    const result = extractExportedConstValue(ast, key);
    if (result == null) continue;
    if ("unsupported" in result) {
      const where = result.path ? ` at ${result.path}` : "";
      problems.push(
        `${filename}: export const ${key} is not a static literal${where}: ${result.unsupported}. Use a number, string, or boolean literal. Next.js does not evaluate an imported constant, and the production build stops while collecting page data.`,
      );
      continue;
    }
    if (schemaKeys.includes(key)) exported[key] = result.value;
  }
  if (problems.length) return problems;

  try {
    parseAppSegmentConfig(exported, filename);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    problems.push(`${filename}: ${message}`);
  }
  return problems;
}

export async function findSegmentConfigProblems() {
  const problems = [];
  for (const file of routeFiles()) {
    const source = readFileSync(file, "utf8");
    problems.push(...(await segmentConfigProblemsInSource(relative(root, file), source)));
  }
  return problems;
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const problems = await findSegmentConfigProblems();
  if (problems.length) {
    console.error(
      "Route segment config must be a literal. Next.js rejects anything else during the production build.\n",
    );
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
}
