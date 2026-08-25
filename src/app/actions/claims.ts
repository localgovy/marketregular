"use server";

import { Resend } from "resend";
import { isClaimRole } from "@/lib/claim";
import { CLAIM_INBOX, SITE_NAME, SITE_URL } from "@/lib/constants";
import { claimMailAllowed, clientIp, hashMailKey, recordClaimMail } from "@/lib/mail-limit";
import { createServiceClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function listingFor(
  targetType: "market" | "vendor",
  targetId: string,
): Promise<{ name: string; path: string } | null> {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return null;
  if (targetType === "market") {
    const { data } = await supabase
      .from("markets")
      .select("name, slug")
      .eq("id", targetId)
      .maybeSingle();
    return data?.slug ? { name: data.name, path: `/markets/${data.slug}` } : null;
  }
  const { data } = await supabase
    .from("vendors")
    .select("name, slug")
    .eq("id", targetId)
    .maybeSingle();
  return data?.slug ? { name: data.name, path: `/vendors/${data.slug}` } : null;
}

function claimEmail(fields: {
  listingName: string;
  listingUrl: string;
  kind: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  business: string;
  website: string;
  notes: string;
  signedIn: boolean;
}) {
  const rows: [string, string][] = [
    ["Listing", fields.listingName],
    ["Type", fields.kind],
    ["Page", fields.listingUrl],
    ["Name", fields.name],
    ["Email", fields.email],
    ["Phone", fields.phone || "(not given)"],
    ["Role", fields.role],
    ["Business or stall", fields.business || "(not given)"],
    ["Website or Instagram", fields.website || "(not given)"],
    ["Notes", fields.notes || "(none)"],
    ["Signed in", fields.signedIn ? "Yes" : "No"],
  ];
  const text = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#5e5a53">${escapeHtml(label)}</td><td style="padding:6px 0;vertical-align:top">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html>
<html><body style="margin:0;background:#F1EDE3;color:#141414;font-family:ui-sans-serif,system-ui,sans-serif">
<div style="max-width:32rem;margin:0 auto;padding:24px">
<p style="margin:0 0 8px;font-size:14px;color:#5e5a53">${escapeHtml(SITE_NAME)} claim</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${escapeHtml(fields.listingName)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0">${htmlRows}</table>
</div>
</body></html>`;
  return { text, html };
}

export async function submitClaim(formData: FormData) {
  if (clip(formData.get("_gotcha"), 80)) {
    return { error: null, message: "Thanks. We'll email you after a look." };
  }

  const target_type = String(formData.get("target_type"));
  if (target_type !== "market" && target_type !== "vendor") {
    return { error: "That listing is missing." };
  }
  const target_id = String(formData.get("target_id"));
  if (!UUID.test(target_id)) return { error: "That listing is missing." };

  const name = clip(formData.get("name"), 80);
  const email = clip(formData.get("email"), 120).toLowerCase();
  const phone = clip(formData.get("phone"), 40);
  const role = clip(formData.get("role"), 80);
  const business = clip(formData.get("business"), 120);
  const website = clip(formData.get("website"), 200);
  const notes = clip(formData.get("notes"), 2000);

  if (name.length < 2) return { error: "Add your name." };
  if (!EMAIL.test(email)) return { error: "Add a working email." };
  if (!isClaimRole(target_type, role)) {
    return { error: "Pick how you relate to this listing." };
  }

  const listing = await listingFor(target_type, target_id);
  if (!listing) return { error: "We couldn't find that listing." };

  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !from) {
    return { error: `Mail is not set up yet. Write ${CLAIM_INBOX} directly.` };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const service = createServiceClient();
  if (!service) {
    return { error: `Mail is not set up yet. Write ${CLAIM_INBOX} directly.` };
  }
  const ip = await clientIp();
  const keys = [hashMailKey(`ip:${ip}|email:${email}`)];
  if (user) keys.push(hashMailKey(`user:${user.id}`));
  const allowed = await claimMailAllowed(service, keys);
  if (!allowed) {
    return { error: "Wait a bit before sending another claim." };
  }
  await recordClaimMail(service, keys);

  const listingUrl = `${SITE_URL}${listing.path}`;
  const kind = target_type === "market" ? "market" : "stall";
  const mail = claimEmail({
    listingName: listing.name,
    listingUrl,
    kind,
    name,
    email,
    phone,
    role,
    business,
    website,
    notes,
    signedIn: Boolean(user),
  });

  const resend = new Resend(key);
  const { error: sendError } = await resend.emails.send({
    from,
    to: CLAIM_INBOX,
    replyTo: email,
    subject: `Claim request — ${listing.name}`,
    text: mail.text,
    html: mail.html,
  });
  if (sendError) return { error: sendError.message };

  if (user && supabase) {
    const evidence = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      `Role: ${role}`,
      business ? `Business or stall: ${business}` : null,
      website ? `Website or Instagram: ${website}` : null,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const { error } = await supabase.from("claim_requests").insert({
      user_id: user.id,
      target_type,
      target_id,
      evidence,
      status: "pending",
    });
    if (error) return { error: error.message };
    revalidatePath("/account");
  }

  return { error: null, message: "Thanks. We'll email you after a look." };
}
