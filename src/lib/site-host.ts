/** Hosts we treat as this product. Suffix match is not enough (`evil-marketregular.com`). */
export function isTrustedSiteHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "marketregular.com" ||
    hostname.endsWith(".marketregular.com")
  );
}
