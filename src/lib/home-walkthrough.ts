export const HOME_WALKTHROUGH_KEY = "mr-home-walkthrough";
export const HOME_WALKTHROUGH_EVENT = "mr-home-walkthrough";

export function homeWalkthroughSeen() {
  try {
    return Boolean(window.localStorage.getItem(HOME_WALKTHROUGH_KEY));
  } catch {
    return false;
  }
}

export function rememberHomeWalkthrough() {
  try {
    window.localStorage.setItem(HOME_WALKTHROUGH_KEY, String(Date.now()));
  } catch {
    // private mode
  }
  window.dispatchEvent(new Event(HOME_WALKTHROUGH_EVENT));
}

export function subscribeHomeWalkthrough(listener: () => void) {
  window.addEventListener(HOME_WALKTHROUGH_EVENT, listener);
  return () => window.removeEventListener(HOME_WALKTHROUGH_EVENT, listener);
}
