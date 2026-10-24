import { isProductionBuild } from "@/lib/build-phase";

const RETRY_STATUSES = new Set([408, 429, 502, 503, 504, 520, 522, 524]);
const ATTEMPTS = 3;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 8000;

/** In-flight cap during `next build`. Runtime traffic is not queued. */
export const BUILD_FETCH_CONCURRENCY = 5;

type Gate = {
  active: number;
  waiters: Array<() => void>;
};

const GATE = Symbol.for("marketregular.buildFetchGate");

function gate(): Gate {
  const host = globalThis as typeof globalThis & { [GATE]?: Gate };
  if (!host[GATE]) host[GATE] = { active: 0, waiters: [] };
  return host[GATE];
}

export function resetBuildFetchGateForTests() {
  const current = gate();
  current.active = 0;
  current.waiters = [];
}

/** 1s, 2s, 4s, capped, plus a little jitter so retries do not line up. */
export function gatewayRetryDelayMs(attempt: number) {
  const exp = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt);
  return exp + Math.floor(Math.random() * 200);
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  return method.toUpperCase();
}

/** Gateway HTML is not a directory error. Reads can try again; writes must not. */
function canRetry(method: string) {
  return method === "GET" || method === "HEAD";
}

async function releaseBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // The socket may already be closed.
  }
}

function acquireBuildFetchSlot() {
  const current = gate();
  if (current.active < BUILD_FETCH_CONCURRENCY) {
    current.active += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    current.waiters.push(resolve);
  });
}

function releaseBuildFetchSlot() {
  const current = gate();
  const next = current.waiters.shift();
  if (next) {
    next();
    return;
  }
  current.active = Math.max(0, current.active - 1);
}

/**
 * Static generation used to fire thousands of directory reads at once. Reads
 * wait for a free slot during `next build`, and a gateway or rate-limit
 * failure waits out an exponential backoff before the next try.
 */
export function fetchWithGatewayRetry(
  fetchImpl: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): typeof fetch {
  const wrapped: typeof fetch = async (input, init) => {
    const limited = isProductionBuild();
    if (limited) await acquireBuildFetchSlot();
    try {
      const retry = canRetry(requestMethod(input, init));
      let response: Response | undefined;
      for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
        const request = input instanceof Request ? input.clone() : input;
        try {
          response = await fetchImpl(request, init);
        } catch (error) {
          if (!retry || attempt === ATTEMPTS - 1) throw error;
          await wait(gatewayRetryDelayMs(attempt));
          continue;
        }
        if (!retry || !RETRY_STATUSES.has(response.status) || attempt === ATTEMPTS - 1) {
          return response;
        }
        await releaseBody(response);
        await wait(gatewayRetryDelayMs(attempt));
      }
      if (!response) throw new Error("Directory read failed");
      return response;
    } finally {
      if (limited) releaseBuildFetchSlot();
    }
  };
  return wrapped;
}
