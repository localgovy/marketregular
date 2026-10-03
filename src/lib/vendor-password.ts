import { createCipheriv, createDecipheriv, randomBytes, randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Row stays so a later approval does not rotate the password. The secret does not. */
export const CHOSEN_PASSWORD_MARKER = "chosen.v1.password-not-stored";

export function generateVendorPassword() {
  let password = "";
  for (let i = 0; i < 12; i++) password += ALPHABET[randomInt(ALPHABET.length)];
  return password;
}

export function vendorPasswordKey() {
  const raw = process.env.VENDOR_PASSWORD_KEY?.trim() ?? "";
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) return null;
  return key;
}

export function encryptVendorPassword(password: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptVendorPassword(payload: string, key: Buffer) {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data || payload.split(".").length !== 4) {
    throw new Error("bad");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export type StoredSecret = { ciphertext: string; chosen: boolean };

/** A failed Auth update must not leave Desk showing a password that does not sign in. */
export function secretAfterFailedAuth(previous: StoredSecret | null):
  | { action: "delete" }
  | { action: "restore"; row: StoredSecret } {
  if (!previous) return { action: "delete" };
  return { action: "restore", row: previous };
}

/** Email the password that is actually stored. Another approval may have replaced ours. */
export function alignIssuedPassword(attempted: string, stored: string) {
  if (stored === attempted) return { password: attempted, realign: false };
  return { password: stored, realign: true };
}

/** Skip once they have chosen. Resend the same one-time password while they still owe the change. */
export function claimPasswordAction(
  existing: { chosen: boolean } | null,
  mustSet: boolean,
): "skip" | "resend" | "issue" {
  if (existing?.chosen) return "skip";
  if (mustSet && existing && !existing.chosen) return "resend";
  return "issue";
}

export function readVendorPassword(ciphertext: string, chosen: boolean) {
  if (chosen || ciphertext === CHOSEN_PASSWORD_MARKER) return null;
  const label = "One-time password";
  const key = vendorPasswordKey();
  if (!key) return { label, value: "The stall password key is not set." };
  try {
    return { label, value: decryptVendorPassword(ciphertext, key) };
  } catch {
    return { label, value: "Could not read that password." };
  }
}

export function withMustSetPassword(
  appMetadata: Record<string, unknown> | undefined,
  must: boolean,
) {
  return { ...(appMetadata ?? {}), must_set_password: must };
}
