import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  DATA_API_GATE_HEADER,
  dataApiGateHeaders,
} from "../src/lib/supabase/data-api-gate.ts";

const migration = new URL(
  "../supabase/migrations/20261113193000_service_role_data_api_gate.sql",
  import.meta.url,
);

test("service client sends the gate only when a server secret is set", () => {
  const previous = process.env.MARKETREGULAR_DATA_API_GATE;
  try {
    delete process.env.MARKETREGULAR_DATA_API_GATE;
    assert.deepEqual(dataApiGateHeaders(), {});
    process.env.MARKETREGULAR_DATA_API_GATE = "too-short";
    assert.deepEqual(dataApiGateHeaders(), {});
    const gate = "a".repeat(64);
    process.env.MARKETREGULAR_DATA_API_GATE = `  ${gate}  `;
    assert.deepEqual(dataApiGateHeaders(), { [DATA_API_GATE_HEADER]: gate });
  } finally {
    if (previous === undefined) delete process.env.MARKETREGULAR_DATA_API_GATE;
    else process.env.MARKETREGULAR_DATA_API_GATE = previous;
  }
});

test("service role no longer skips the data api allowlist", () => {
  const sql = readFileSync(migration, "utf8");
  const admin = readFileSync(new URL("../src/lib/supabase/admin.ts", import.meta.url), "utf8");
  assert.match(sql, /x-marketregular-gate/);
  assert.match(sql, /private\.data_api_gate/);
  assert.match(sql, /not allowed/);
  assert.doesNotMatch(sql, /if auth\.role\(\) = 'service_role' then\s+return;/);
  assert.match(admin, /dataApiGateHeaders\(\)/);
});
