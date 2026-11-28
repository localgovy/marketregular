/** Publishable and secret keys are not JWTs. They belong on `apikey` only.
 *  A legacy JWT key still needs `Authorization: Bearer`. */
export function supabaseApiKeyHeaders(key: string): Record<string, string> {
  const headers: Record<string, string> = { apikey: key };
  if (!key.startsWith("sb_publishable_") && !key.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}
