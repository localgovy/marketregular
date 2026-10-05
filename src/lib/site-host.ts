/** Hosts we treat as this product. Suffix match is not enough (`evil-marketregular.com`). */
export function isTrustedSiteHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "marketregular.com" ||
    hostname.endsWith(".marketregular.com")
  );
}

/** Checkout return origin. The request Host is not an input. */
export function checkoutSiteOrigin(siteUrl: string) {
  return siteUrl;
}

/** Checkout return URL. Local and trusted hosts stay put; anything else uses the public site. */
export function originFromHost(hostHeader: string | null, protoHeader: string | null, fallback: string) {
  const host = (hostHeader ?? "").split(",")[0]?.trim() ?? "";
  if (!host || /[@/\\\s]/.test(host)) return fallback;
  const parts = host.split(":");
  if (parts.length > 2) return fallback;
  const hostname = parts[0] ?? "";
  const port = parts[1];
  if (port != null && !/^\d+$/.test(port)) return fallback;
  if (!isTrustedSiteHost(hostname)) return fallback;
  const raw = (protoHeader ?? "").split(",")[0]?.trim().toLowerCase();
  if (raw && raw !== "http" && raw !== "https") return fallback;
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  return `${local ? "http" : "https"}://${host}`;
}
