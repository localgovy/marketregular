import "server-only";

import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { sanitizeMailAddress, sanitizeMailHeader } from "@/lib/mail-header";
import type { ClaimTarget } from "@/types/database";
import { Resend } from "resend";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function portalDeclineLetter(kind: ClaimTarget) {
  const stall = kind === "vendor";
  const url = `${SITE_URL}${stall ? "/vendor" : "/market"}`;
  const sentence = stall
    ? "We couldn't assign a stall to this account. You can sign in and send another request."
    : "We couldn't assign a market to this account. You can sign in and send another request.";
  const text = `${sentence}\n\n${url}`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#F1EDE3;color:#141414;font-family:ui-sans-serif,system-ui,sans-serif">
<div style="max-width:32rem;margin:0 auto;padding:24px">
<p style="margin:0 0 8px;font-size:14px;color:#5e5a53">${escapeHtml(SITE_NAME)}</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${stall ? "No stall was assigned" : "No market was assigned"}</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${escapeHtml(sentence)}</p>
<p style="margin:0"><a href="${escapeHtml(url)}" style="color:#141414">${escapeHtml(url)}</a></p>
</div>
</body></html>`;
  return {
    url,
    text,
    html,
    subject: sanitizeMailHeader(stall ? `Your stall on ${SITE_NAME}` : `Your market on ${SITE_NAME}`),
  };
}

export function portalApplicationNotice(fields: {
  kind: ClaimTarget;
  name: string;
  email: string;
  organizationName: string | null;
  listingName: string | null;
  listingUrl: string | null;
}) {
  const rows: [string, string][] = [
    ["Portal", fields.kind],
    ["Name", fields.name],
    ["Email", fields.email],
    ["Organization", fields.organizationName || "(not given)"],
    ["Listing", fields.listingName || "(not chosen)"],
    ["Page", fields.listingUrl || "(none)"],
  ];
  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#5e5a53">${escapeHtml(label)}</td><td style="padding:6px 0;vertical-align:top">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const title = fields.listingName || fields.organizationName || "Account request";
  const html = `<!doctype html>
<html><body style="margin:0;background:#F1EDE3;color:#141414;font-family:ui-sans-serif,system-ui,sans-serif">
<div style="max-width:32rem;margin:0 auto;padding:24px">
<p style="margin:0 0 8px;font-size:14px;color:#5e5a53">${escapeHtml(SITE_NAME)}</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${escapeHtml(title)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0">${htmlRows}</table>
</div>
</body></html>`;
  return {
    text,
    html,
    subject: sanitizeMailHeader(`Account request — ${title}`),
  };
}

export async function sendPortalDeclineMail(email: string, kind: ClaimTarget) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !from) return { sent: false };
  const letter = portalDeclineLetter(kind);
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: letter.subject,
      text: letter.text,
      html: letter.html,
    });
    if (error) {
      console.error("portal decline mail", error.name ?? "send");
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.error("portal decline mail", error instanceof Error ? error.message : "send");
    return { sent: false };
  }
}

export async function sendPortalApplicationNotice(input: {
  to: string;
  replyTo: string;
  kind: ClaimTarget;
  name: string;
  email: string;
  organizationName: string | null;
  listingName: string | null;
  listingUrl: string | null;
}) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !from) return { sent: false };
  const letter = portalApplicationNotice(input);
  const replyTo = sanitizeMailAddress(input.replyTo);
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      ...(replyTo ? { replyTo } : {}),
      subject: letter.subject,
      text: letter.text,
      html: letter.html,
    });
    if (error) {
      console.error("portal application mail", error.name ?? "send");
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.error("portal application mail", error instanceof Error ? error.message : "send");
    return { sent: false };
  }
}
