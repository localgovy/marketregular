/** First sign-in after a vendor claim must land on the new-password page. */
export function mustSetPassword(appMetadata: unknown) {
  return (
    typeof appMetadata === "object" &&
    appMetadata !== null &&
    (appMetadata as { must_set_password?: unknown }).must_set_password === true
  );
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
