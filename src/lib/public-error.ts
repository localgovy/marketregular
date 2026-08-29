/** User-facing copies for auth/DB failures. Never return provider `error.message`. */

type AuthLike = { code?: string; message?: string; status?: number };
type DbLike = { code?: string; message?: string };

function authCode(error: AuthLike) {
  return (error.code ?? "").toLowerCase();
}

function authMessage(error: AuthLike) {
  return (error.message ?? "").toLowerCase();
}

export function isAuthRateLimited(error: AuthLike) {
  const code = authCode(error);
  return (
    error.status === 429 ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "too_many_requests"
  );
}

export function signInPublicError(error: AuthLike) {
  if (isAuthRateLimited(error)) return "Wait a bit, then try again.";
  const code = authCode(error);
  const message = authMessage(error);
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Confirm your email first.";
  }
  if (code === "invalid_credentials" || message.includes("invalid login")) {
    return "Email or password is not right.";
  }
  return "Could not sign in.";
}

export function signUpPublicError(error: AuthLike): { error: string | null; message?: string } {
  if (isAuthRateLimited(error)) return { error: "Wait a bit, then try again." };
  const code = authCode(error);
  const message = authMessage(error);
  if (
    code === "email_exists" ||
    code === "user_already_exists" ||
    message.includes("already registered")
  ) {
    return { error: null, message: "Check your email to confirm your account." };
  }
  if (code === "weak_password") return { error: "Use at least 8 characters." };
  if (code === "validation_failed" && message.includes("email")) {
    return { error: "Add a working email." };
  }
  return { error: "Could not create that account." };
}

export function passwordUpdatePublicError(error: AuthLike) {
  if (isAuthRateLimited(error)) return "Wait a bit, then try again.";
  const code = authCode(error);
  if (code === "same_password") return "Pick a password you have not used here.";
  if (code === "weak_password") return "Use at least 8 characters.";
  return "Could not update the password.";
}

export const LOGIN_ERROR_COPY = {
  oauth: "Sign-in was cancelled or did not finish. Try again.",
  session: "Could not finish signing in. Try again.",
} as const;

export type LoginErrorKey = keyof typeof LOGIN_ERROR_COPY;

export function isLoginErrorKey(value: string | undefined): value is LoginErrorKey {
  return value === "oauth" || value === "session";
}

export function loginQueryError(value: string | undefined) {
  return isLoginErrorKey(value) ? LOGIN_ERROR_COPY[value] : undefined;
}

export function dbPublicError(error: DbLike | null | undefined, fallback: string) {
  if (!error) return fallback;
  const message = error.message ?? "";
  if (error.code === "P0001") {
    if (message.includes("Daily review limit")) {
      return "Daily review limit reached. See you tomorrow.";
    }
    if (message.includes("This post was removed")) return "That review cannot be posted.";
    if (message.includes("Photo URL") || message.includes("Too many photos")) {
      return "Those photos could not be attached.";
    }
    if (message.includes("Wait a bit")) return "Wait a bit before sending another claim.";
    if (message.includes("listing is missing")) return "That listing is missing.";
    if (message.includes("Evidence is too long")) return "Keep the notes a bit shorter.";
    if (message.includes("handle is reserved") || message.includes("handle is taken")) {
      return "That handle is taken.";
    }
    if (message.includes("Save list is full")) return "Save list is full.";
    if (message.includes("Avatar URL") || message.includes("Logo URL")) {
      return "That image could not be saved.";
    }
    if (message.includes("Listing URL")) {
      return "That link could not be saved.";
    }
  }
  return fallback;
}
