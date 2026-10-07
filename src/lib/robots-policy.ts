/**
 * Google prefix-matches robots.txt paths. `Disallow: /vendor` also blocks
 * `/vendors` and every stall page. `$` is end-of-URL, so `/vendor$` plus
 * `/vendor/` and `/vendor?` cover the portal without touching `/vendors`.
 * `/market` vs `/markets` uses the same split.
 */
export const ROBOTS_ALLOW = ["/", "/markets", "/vendors"] as const;

function privateRoot(path: string) {
  const root = path.endsWith("/") ? path.slice(0, -1) : path;
  return [`${root}$`, `${root}/`, `${root}?`] as const;
}

export const ROBOTS_DISALLOW = [
  ...privateRoot("/admin"),
  ...privateRoot("/account"),
  ...privateRoot("/vendor"),
  ...privateRoot("/market"),
  ...privateRoot("/auth"),
  ...privateRoot("/onboarding"),
  ...privateRoot("/saved"),
  ...privateRoot("/kept"),
] as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Google's robots.txt match: `*` any run, `$` end of URL, otherwise prefix. */
export function robotsRuleMatches(pattern: string, path: string) {
  const exact = pattern.endsWith("$");
  const body = exact ? pattern.slice(0, -1) : pattern;
  const source = `^${body.split("*").map(escapeRegex).join(".*")}${exact ? "$" : ""}`;
  return new RegExp(source).test(path);
}

function ruleLength(pattern: string) {
  return pattern.endsWith("$") ? pattern.length - 1 : pattern.length;
}

export function isRobotsDisallowed(
  path: string,
  rules: { allow?: readonly string[]; disallow?: readonly string[] } = {
    allow: ROBOTS_ALLOW,
    disallow: ROBOTS_DISALLOW,
  },
) {
  let winnerType: "allow" | "disallow" | null = null;
  let winnerLength = -1;
  for (const pattern of rules.allow ?? []) {
    if (!robotsRuleMatches(pattern, path)) continue;
    const length = ruleLength(pattern);
    if (length > winnerLength || (length === winnerLength && winnerType !== "allow")) {
      winnerType = "allow";
      winnerLength = length;
    }
  }
  for (const pattern of rules.disallow ?? []) {
    if (!robotsRuleMatches(pattern, path)) continue;
    const length = ruleLength(pattern);
    // Equal length: Allow wins (Google's tie-break).
    if (length > winnerLength) {
      winnerType = "disallow";
      winnerLength = length;
    }
  }
  return winnerType === "disallow";
}

export function robotsPathFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
