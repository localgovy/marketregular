import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { upcomingByDay, type UpcomingGroup } from "@/lib/upcoming";
import type { Market, MarketSchedule } from "@/types/database";

export function weekPlanForSlugs(
  slugs: string[],
  markets: Market[],
  scheduleMap: Map<string, MarketSchedule[]>,
  now = new Date(),
): UpcomingGroup[] {
  const bySlug = new Map(markets.map((market) => [market.slug, market]));
  const selected = slugs
    .map((slug) => bySlug.get(slug))
    .filter((market): market is Market => Boolean(market));
  return upcomingByDay(selected, scheduleMap, now);
}

export function visitPlanText(groups: UpcomingGroup[]) {
  const lines = [`This week at ${SITE_NAME}`, ""];
  if (!groups.length) {
    lines.push("None of those halls are on the calendar this week. Check the live list:");
    lines.push(`${SITE_URL}/markets`);
    return lines.join("\n");
  }
  for (const group of groups) {
    lines.push(`${group.label} · ${group.date}`);
    for (const slot of group.slots) {
      lines.push(slot.market.name);
      lines.push(slot.market.address);
      lines.push(`${slot.hours}${slot.open ? " · open now" : ""}`);
      lines.push(`${SITE_URL}/markets/${slot.market.slug}`);
      lines.push("");
    }
  }
  lines.push("Search halls and stalls: " + `${SITE_URL}/markets`);
  lines.push("Your saved list: " + `${SITE_URL}/saved`);
  return lines.join("\n").trim() + "\n";
}

export function visitPlanHtml(groups: UpcomingGroup[]) {
  const rows = groups.length
    ? groups
        .map((group) => {
          const slots = group.slots
            .map((slot) => {
              const href = `${SITE_URL}/markets/${slot.market.slug}`;
              const hours = `${slot.hours}${slot.open ? " · open now" : ""}`;
              return `<p style="margin:0 0 12px;line-height:1.4">
<strong>${escapeHtml(slot.market.name)}</strong><br/>
${escapeHtml(slot.market.address)}<br/>
<span style="font-family:ui-monospace,Menlo,monospace;font-size:14px">${escapeHtml(hours)}</span><br/>
<a href="${href}" style="color:#24352B">${escapeHtml(href)}</a>
</p>`;
            })
            .join("");
          return `<h2 style="font-size:18px;margin:20px 0 8px">${escapeHtml(group.label)} · ${escapeHtml(group.date)}</h2>${slots}`;
        })
        .join("")
    : `<p>None of those halls are on the calendar this week. See <a href="${SITE_URL}/markets">${SITE_URL}/markets</a>.</p>`;

  return `<!doctype html>
<html><body style="margin:0;background:#F1EDE3;color:#141414;font-family:Georgia,serif">
<div style="max-width:32rem;margin:0 auto;padding:24px">
<p style="margin:0 0 16px;font-size:14px">This week at ${escapeHtml(SITE_NAME)}</p>
${rows}
<p style="margin:24px 0 0;font-size:14px;color:#5C7A86">
Search: <a href="${SITE_URL}/markets" style="color:#24352B">${SITE_URL}/markets</a><br/>
Saved: <a href="${SITE_URL}/saved" style="color:#24352B">${SITE_URL}/saved</a>
</p>
</div>
</body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
