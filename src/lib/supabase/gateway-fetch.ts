const RETRY_STATUSES = new Set([502, 503, 504, 520, 522, 524]);
const ATTEMPTS = 3;
/** Database statements already stop at 8 seconds. This only bounds a stalled socket. */
const ATTEMPT_TIMEOUT_MS = 20_000;

function callerSignal(input: RequestInfo | URL, init?: RequestInit) {
  return init?.signal ?? (input instanceof Request ? input.signal : undefined);
}

function signalForAttempt(caller: AbortSignal | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!caller) return timeout;
  return AbortSignal.any([caller, timeout]);
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  const method = init?.method ?? (input instanceof Request ? input.method : "GET");
  return method.toUpperCase();
}

/** Gateway HTML is not a directory error. Reads can try again; writes must not. */
function canRetry(method: string) {
  return method === "GET" || method === "HEAD";
}

async function release(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // The socket may already be closed.
  }
}

/**
 * Static generation issues thousands of directory reads. One Cloudflare 502
 * aborts the export, so idempotent reads try again before the client sees
 * the gateway page.
 */
export function fetchWithGatewayRetry(
  fetchImpl: typeof fetch = fetch,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  attemptTimeoutMs: number = ATTEMPT_TIMEOUT_MS,
): typeof fetch {
  const wrapped: typeof fetch = async (input, init) => {
    const retry = canRetry(requestMethod(input, init));
    const caller = callerSignal(input, init);
    let response: Response | undefined;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const request = input instanceof Request ? input.clone() : input;
      const signal = signalForAttempt(caller, attemptTimeoutMs);
      try {
        response = await fetchImpl(request, { ...init, signal });
      } catch (error) {
        if (caller?.aborted || !retry || attempt === ATTEMPTS - 1) throw error;
        await wait(200 * 2 ** attempt);
        continue;
      }
      if (!retry || !RETRY_STATUSES.has(response.status) || attempt === ATTEMPTS - 1) {
        return response;
      }
      await release(response);
      await wait(200 * 2 ** attempt);
    }
    if (!response) throw new Error("Directory read failed");
    return response;
  };
  return wrapped;
}
