/** Hosts we treat as this product. Suffix match is not enough (`evil-marketregular.com`). */
export function isTrustedSiteHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "marketregular.com" ||
    hostname.endsWith(".marketregular.com")
  );
}

/** Checkout return URL. Local and trusted hosts stay put; anything else uses the public site. */
export function originFromHost(hostHeader: string | null, protoHeader: string | null, fallback: string) {
  const host = (hostHeader ?? "").split(",")[0]?.trim() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (!host || !isTrustedSiteHost(hostname)) return fallback;
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  const proto = local ? "http" : (protoHeader ?? "https").split(",")[0]?.trim() || "https";
  return `${proto}://${host}`;
}
