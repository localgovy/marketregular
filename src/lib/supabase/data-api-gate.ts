/** Header the Data API requires on service-role calls. Not a publishable value. */
export const DATA_API_GATE_HEADER = "x-marketregular-gate";

const GATE_ENV = "MARKETREGULAR_DATA_API_GATE";

let warnedMissing = false;

/** Dynamic lookup so the bundler does not bake an empty value at build time. */
function readGate(): string {
  const raw = process.env[GATE_ENV];
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Present only when the server has the gate. A short or empty value is omitted
 * so a missing env does not send a guessable header.
 */
export function dataApiGateHeaders(): Record<string, string> {
  const gate = readGate();
  if (gate.length < 32) return {};
  return { [DATA_API_GATE_HEADER]: gate };
}

/** Attach the gate to an outgoing Supabase request. Warn once if it is unset. */
export function applyDataApiGate(headers: Headers) {
  const gate = readGate();
  if (gate.length < 32) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn("data-api-gate-missing");
    }
    return;
  }
  if (!headers.has(DATA_API_GATE_HEADER)) headers.set(DATA_API_GATE_HEADER, gate);
}
