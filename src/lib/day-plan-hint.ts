export const DAY_PLAN_HINT_EVENT = "mr-day-plan-hint";

export function openDayPlanHint() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DAY_PLAN_HINT_EVENT));
}

export function subscribeDayPlanHint(listener: () => void) {
  window.addEventListener(DAY_PLAN_HINT_EVENT, listener);
  return () => window.removeEventListener(DAY_PLAN_HINT_EVENT, listener);
}
