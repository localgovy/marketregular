/** First sign-in after an issued password must land on the new-password page. */
export function mustSetPassword(appMetadata: unknown) {
  return (
    typeof appMetadata === "object" &&
    appMetadata !== null &&
    (appMetadata as { must_set_password?: unknown }).must_set_password === true
  );
}

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The reset cookie names the account that opened the link. Another sign-in does not inherit it. */
export function recoveryMatchesUser(cookie: string | undefined, userId: string) {
  if (!cookie || !USER_ID.test(cookie) || !USER_ID.test(userId)) return false;
  return cookie.toLowerCase() === userId.toLowerCase();
}

/** A recovery link proves the inbox. A normal sign-in still needs the current password. */
export function canChangePassword(input: {
  recovery: boolean;
  hasPassword: boolean;
  currentOk: boolean;
  recentSignIn: boolean;
}) {
  if (input.recovery) return true;
  if (input.hasPassword) return input.currentOk;
  return input.recentSignIn;
}

export function passwordChangeAllowed(path: string) {
  const bare = path.split("?")[0]?.split("#")[0] ?? path;
  return bare === "/account/password" || bare.startsWith("/auth/");
}
