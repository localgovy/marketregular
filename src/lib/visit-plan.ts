import {
  SITE_LOGO,
  SITE_NAME,
  SITE_URL,
  STUDIO_NAME,
  STUDIO_URL,
  STUDIO_WORDMARK,
} from "@/lib/constants";
import { upcomingByDay, type UpcomingGroup } from "@/lib/upcoming";
import type { Market, MarketSchedule } from "@/types/database";

/** Brand files must be on the live host — mail clients cannot load localhost. */
function emailOrigin() {
  try {
    if (new URL(SITE_URL).hostname.endsWith("marketregular.com")) return SITE_URL;
  } catch {
    /* fall through */
  }
  return "https://www.marketregular.com";
}

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
  const lines = [`${SITE_NAME} by ${STUDIO_NAME}`, "", `This week at ${SITE_NAME}`, ""];
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

  const origin = emailOrigin();
  const home = escapeHtml(origin);
  const mark = escapeHtml(`${origin}${SITE_LOGO}`);
  const wordmark = escapeHtml(`${origin}${STUDIO_WORDMARK}`);
  const studio = escapeHtml(STUDIO_URL);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
</head>
<body style="margin:0;background:#F1EDE3;color:#141414;font-family:Georgia,serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1EDE3">
<tr><td align="center">
<table role="presentation" width="512" cellpadding="0" cellspacing="0" border="0" style="max-width:32rem;width:100%">
<tr>
<td bgcolor="#2c4a40" style="background:#2c4a40;padding:16px 24px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td valign="middle" style="padding:0 10px 0 0">
<a href="${home}" style="text-decoration:none">
<img src="${mark}" width="32" height="32" alt="" style="display:block;border:0;border-radius:3px;outline:none"/>
</a>
</td>
<td valign="middle" style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.15">
<a href="${home}" style="font-size:20px;font-weight:500;letter-spacing:-0.04em;color:#f3eee4;text-decoration:none">${escapeHtml(SITE_NAME)}</a>
<a href="${studio}" style="font-size:14px;font-weight:400;color:#c5ddd4;text-decoration:none;padding-left:8px">
by <img src="${wordmark}" width="67" height="15" alt="${escapeHtml(STUDIO_NAME)}" style="display:inline;border:0;vertical-align:middle;margin:0 0 2px 4px;outline:none"/>
</a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:24px">
<p style="margin:0 0 16px;font-size:14px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif">This week at ${escapeHtml(SITE_NAME)}</p>
${rows}
<p style="margin:24px 0 0;font-size:14px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:#5C7A86">
Search: <a href="${SITE_URL}/markets" style="color:#24352B">${SITE_URL}/markets</a><br/>
Saved: <a href="${SITE_URL}/saved" style="color:#24352B">${SITE_URL}/saved</a>
</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
