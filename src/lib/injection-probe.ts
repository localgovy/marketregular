/**
 * Strings that are not product, stall, or market names. A match skips the
 * database and is refused at the edge. Apostrophes, single hyphens, accents,
 * ampersands, and slashes stay searchable.
 */
const INJECTION_PROBE =
  /union\s+select|pg_sleep|information_schema|pg_catalog|\/\*|--|\0|%00|;\s*(?:select|insert|update|delete|drop|alter|create|grant|revoke|truncate|execute|copy|union)\b|\bor\s+1\s*=\s*1\b/i;

export function isInjectionProbe(value: string | null | undefined) {
  if (!value) return false;
  return INJECTION_PROBE.test(value);
}
