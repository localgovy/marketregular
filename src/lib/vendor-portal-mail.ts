import "server-only";

import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { sanitizeMailHeader } from "@/lib/mail-header";
import { Resend } from "resend";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendVendorPortalMail(email: string, password?: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !from) return;
  const url = password
    ? `${SITE_URL}/login?next=${encodeURIComponent("/account/password")}`
    : `${SITE_URL}/vendor`;
  const text = password
    ? `We approved your claim. Sign in with this one-time password, then choose your own.\n\nPassword: ${password}\n\n${url}`
    : `We approved your claim. Sign in to update the name, menu, and the markets you sell at.\n\n${url}`;
  const html = password
    ? `<!doctype html>
<html><body style="margin:0;background:#F1EDE3;color:#141414;font-family:ui-sans-serif,system-ui,sans-serif">
<div style="max-width:32rem;margin:0 auto;padding:24px">
<p style="margin:0 0 8px;font-size:14px;color:#5e5a53">${SITE_NAME}</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">Your stall is ready to edit</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">We approved your claim. Sign in with this one-time password, then choose your own.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">Password: ${escapeHtml(password)}</p>
<p style="margin:0"><a href="${escapeHtml(url)}" style="color:#141414">${escapeHtml(url)}</a></p>
</div>
</body></html>`
    : `<!doctype html>
<html><body style="margin:0;background:#F1EDE3;color:#141414;font-family:ui-sans-serif,system-ui,sans-serif">
<div style="max-width:32rem;margin:0 auto;padding:24px">
<p style="margin:0 0 8px;font-size:14px;color:#5e5a53">${SITE_NAME}</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">Your stall is ready to edit</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5">We approved your claim. Sign in to update the name, menu, and the markets you sell at.</p>
<p style="margin:0"><a href="${url}" style="color:#141414">${url}</a></p>
</div>
</body></html>`;
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: sanitizeMailHeader(`Your stall on ${SITE_NAME}`),
    text,
    html,
  });
  if (error) console.error("vendor portal mail", error.name ?? "send");
}
