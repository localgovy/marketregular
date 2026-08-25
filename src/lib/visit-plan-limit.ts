export const VISIT_PLAN_COOLDOWN_MS = 60 * 60 * 1000;
export const VISIT_PLAN_HOUR_LIMIT = 1;
export const VISIT_PLAN_DAY_LIMIT = 3;

export function visitPlanWaitMs(lastSentAt: string | null | undefined, now = Date.now()) {
  if (!lastSentAt) return 0;
  const sent = Date.parse(lastSentAt);
  if (Number.isNaN(sent)) return 0;
  return Math.max(0, sent + VISIT_PLAN_COOLDOWN_MS - now);
}

export function visitPlanWaitCopy(waitMs: number) {
  const minutes = Math.max(1, Math.ceil(waitMs / 60_000));
  if (minutes >= 60) return "Sent. You can send again in an hour.";
  if (minutes === 1) return "Sent. You can send again in a minute.";
  return `Sent. You can send again in ${minutes} min.`;
}
