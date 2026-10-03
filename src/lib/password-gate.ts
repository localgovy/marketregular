/** First sign-in after a vendor claim must land on the new-password page. */
export function mustSetPassword(appMetadata: unknown) {
  return (
    typeof appMetadata === "object" &&
    appMetadata !== null &&
    (appMetadata as { must_set_password?: unknown }).must_set_password === true
  );
}

export function passwordChangeAllowed(path: string) {
  const bare = path.split("?")[0]?.split("#")[0] ?? path;
  return bare === "/account/password" || bare.startsWith("/auth/");
}
