/** Called from a Server Component so `Date.now()` is not an inline render call. */
export function serverNowMs() {
  return Date.now();
}
