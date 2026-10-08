/**
 * Native history methods, captured when this module first runs in the browser.
 * Import it from the root shell so that happens before Next patches
 * `history.pushState`. Next's patch treats a URL change as a navigation and
 * would blank /markets with the loading skeleton.
 */
function bindNativeHistory() {
  if (typeof window === "undefined") return null;
  return {
    push: window.history.pushState.bind(window.history),
    replace: window.history.replaceState.bind(window.history),
  };
}

const natives = bindNativeHistory();

export function pushAppUrl(href: string) {
  natives?.push(null, "", href);
}

export function replaceAppUrl(href: string) {
  natives?.replace(null, "", href);
}
