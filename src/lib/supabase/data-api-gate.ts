/** Header the Data API requires on service-role calls. Not a publishable value. */
export const DATA_API_GATE_HEADER = "x-marketregular-gate";

/**
 * Present only when the server has the gate. A short or empty value is omitted
 * so a missing env does not send a guessable header.
 */
export function dataApiGateHeaders(): Record<string, string> {
  const gate = process.env.MARKETREGULAR_DATA_API_GATE?.trim() ?? "";
  if (gate.length < 32) return {};
  return { [DATA_API_GATE_HEADER]: gate };
}
