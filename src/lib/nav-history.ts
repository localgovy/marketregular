import { isSignInSlipAuthPath } from "@/lib/signin-slip";

const CUR_KEY = "mr-nav-cur";
const PREV_KEY = "mr-nav-prev";
const AUTH_KEY = "mr-nav-auth";

function pathOnly(value: string) {
  return value.split("?")[0] || value;
}

export function rememberInAppPath(path: string) {
  if (typeof window === "undefined") return;
  try {
    if (isSignInSlipAuthPath(pathOnly(path))) {
      window.sessionStorage.setItem(AUTH_KEY, "1");
      return;
    }
    const cur = window.sessionStorage.getItem(CUR_KEY);
    if (cur && cur !== path) window.sessionStorage.setItem(PREV_KEY, cur);
    window.sessionStorage.setItem(CUR_KEY, path);
  } catch {
    /* private mode / quota */
  }
}

function inAppBackTarget(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const prev = window.sessionStorage.getItem(PREV_KEY);
    if (!prev) return null;
    if (isSignInSlipAuthPath(pathOnly(prev))) return null;
    return prev;
  } catch {
    return null;
  }
}

function consumeCrossedAuth() {
  if (typeof window === "undefined") return false;
  try {
    const crossed = window.sessionStorage.getItem(AUTH_KEY) === "1";
    if (crossed) window.sessionStorage.removeItem(AUTH_KEY);
    return crossed;
  } catch {
    return false;
  }
}

export function goBackInApp(back: () => void, push: (href: string) => void, href: string) {
  const prev = inAppBackTarget();
  if (consumeCrossedAuth()) {
    push(prev ?? href);
    return;
  }
  if (prev) {
    back();
    return;
  }
  push(href);
}
