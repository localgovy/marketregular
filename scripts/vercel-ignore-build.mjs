import { execFileSync } from "node:child_process";

/**
 * Exit 0 skips the Vercel build. Exit 1 builds.
 * Docs, editor files, and test-only commits do not need a deployment.
 * content/ is the blog, so a change there always builds.
 */
const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
const current = process.env.VERCEL_GIT_COMMIT_SHA;
if (!previous || !current || previous === current) process.exit(1);

let files = [];
try {
  files = execFileSync("git", ["diff", "--name-only", previous, current], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
} catch {
  process.exit(1);
}
if (!files.length) process.exit(1);

function skippable(file) {
  return (
    file.startsWith("docs/") ||
    file.startsWith(".cursor/") ||
    file === "AGENTS.md" ||
    file === "CLAUDE.md" ||
    file === "README.md" ||
    /^scripts\/[^/]+\.test\.ts$/.test(file)
  );
}

process.exit(files.every(skippable) ? 0 : 1);
