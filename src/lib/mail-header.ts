/** Strip header metacharacters from outbound mail fields. */
export function sanitizeMailHeader(value: string, max = 180) {
  return value
    .replace(/[\r\n\0\v\f\u0085\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeMailAddress(value: string) {
  return sanitizeMailHeader(value, 120);
}
