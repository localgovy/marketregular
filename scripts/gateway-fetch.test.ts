import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchWithGatewayRetry } from "../src/lib/supabase/gateway-fetch.ts";

const noWait = async () => {};

function jsonResponse(status: number, body = "ok") {
  return new Response(body, { status, headers: { "content-type": "application/json" } });
}

test("a gateway 502 on a read is tried again", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    calls.push(String(input));
    return calls.length === 1
      ? new Response("<html><title>502 Bad Gateway</title></html>", { status: 502 })
      : jsonResponse(200, "[]");
  };
  const response = await fetchWithGatewayRetry(fetchImpl, noWait)("https://example.test/vendors");
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "[]");
  assert.equal(calls.length, 2);
});

test("a network blip on a read is tried again", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("fetch failed");
    return jsonResponse(200);
  };
  const response = await fetchWithGatewayRetry(fetchImpl, noWait)("https://example.test/vendors");
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("a write is not retried", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return jsonResponse(502);
  };
  const response = await fetchWithGatewayRetry(fetchImpl, noWait)("https://example.test/orders", {
    method: "POST",
    body: "{}",
  });
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
});

test("a client error is not retried", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return jsonResponse(400, "bad");
  };
  const response = await fetchWithGatewayRetry(fetchImpl, noWait)("https://example.test/vendors");
  assert.equal(response.status, 400);
  assert.equal(calls, 1);
});

test("a stalled read is aborted and tried again", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = (_input, init) =>
    new Promise((resolve, reject) => {
      calls += 1;
      const signal = init?.signal;
      if (!signal) {
        reject(new Error("missing timeout signal"));
        return;
      }
      if (calls === 1) {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
        return;
      }
      resolve(jsonResponse(200));
    });
  const response = await fetchWithGatewayRetry(fetchImpl, noWait, 30)("https://example.test/vendors");
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("a caller abort is not tried again", async () => {
  let calls = 0;
  const caller = AbortSignal.abort();
  const fetchImpl: typeof fetch = () => {
    calls += 1;
    return Promise.reject(new DOMException("aborted", "AbortError"));
  };
  await assert.rejects(
    () => fetchWithGatewayRetry(fetchImpl, noWait, 30)("https://example.test/vendors", { signal: caller }),
  );
  assert.equal(calls, 1);
});

test("the server gate is attached when it is set", async () => {
  const previous = process.env.MARKETREGULAR_DATA_API_GATE;
  const gate = "b".repeat(64);
  process.env.MARKETREGULAR_DATA_API_GATE = gate;
  let seen = "";
  const fetchImpl: typeof fetch = async (_input, init) => {
    seen = new Headers(init?.headers).get("x-marketregular-gate") ?? "";
    return jsonResponse(200);
  };
  try {
    const response = await fetchWithGatewayRetry(fetchImpl, noWait)("https://example.test/vendors");
    assert.equal(response.status, 200);
    assert.equal(seen, gate);
  } finally {
    if (previous === undefined) delete process.env.MARKETREGULAR_DATA_API_GATE;
    else process.env.MARKETREGULAR_DATA_API_GATE = previous;
  }
});

test("a read stops after the last gateway failure", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return jsonResponse(503);
  };
  const response = await fetchWithGatewayRetry(fetchImpl, noWait)("https://example.test/vendors");
  assert.equal(response.status, 503);
  assert.equal(calls, 3);
});
