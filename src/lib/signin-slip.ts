export const SIGNIN_SLIP_EVENT = "mr-signin-slip";

export type SignInSlipDetail = {
  next: string;
  name: string;
};

export function openSignInSlip(detail: SignInSlipDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SignInSlipDetail>(SIGNIN_SLIP_EVENT, { detail }));
}

export function subscribeSignInSlip(listener: (detail: SignInSlipDetail) => void) {
  function onEvent(event: Event) {
    const custom = event as CustomEvent<SignInSlipDetail>;
    if (!custom.detail?.name) return;
    listener(custom.detail);
  }
  window.addEventListener(SIGNIN_SLIP_EVENT, onEvent);
  return () => window.removeEventListener(SIGNIN_SLIP_EVENT, onEvent);
}

export function isSignInSlipAuthPath(path: string) {
  return (
    path === "/login" ||
    path === "/signup" ||
    path === "/onboarding" ||
    path.startsWith("/auth/")
  );
}
