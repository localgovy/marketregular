import assert from "node:assert/strict";
import { test } from "node:test";
import { findSegmentConfigProblems, segmentConfigProblemsInSource } from "./check-segment-config.mjs";

test("app routes export segment config as literals", async () => {
  assert.deepEqual(await findSegmentConfigProblems(), []);
});

test("an imported revalidate constant is rejected before the production build", async () => {
  const problems = await segmentConfigProblemsInSource(
    "src/app/example/page.tsx",
    "export const revalidate = DIRECTORY_REVALIDATE_SECONDS;\n",
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /revalidate/);
  assert.match(problems[0], /DIRECTORY_REVALIDATE_SECONDS/);
});

test("arithmetic in segment config is rejected", async () => {
  const problems = await segmentConfigProblemsInSource(
    "src/app/example/page.tsx",
    "export const revalidate = 60 * 2;\n",
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /revalidate/);
});

test("literal segment config is accepted", async () => {
  const problems = await segmentConfigProblemsInSource(
    "src/app/example/page.tsx",
    'export const revalidate = 120;\nexport const dynamic = "force-static";\nexport const dynamicParams = false;\nexport const maxDuration = 60;\n',
  );
  assert.deepEqual(problems, []);
});
