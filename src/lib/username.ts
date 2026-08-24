const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const RESERVED = new Set([
  "admin",
  "api",
  "help",
  "localgovy",
  "marketregular",
  "support",
  "www",
]);

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export function usernameError(raw: string) {
  const value = normalizeUsername(raw);
  if (!value) return "Pick a handle.";
  if (!USERNAME_RE.test(value)) return "Use 3–20 letters, numbers, or underscores.";
  if (RESERVED.has(value)) return "That handle is reserved.";
  return null;
}
