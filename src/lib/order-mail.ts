import "server-only";

import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { sanitizeMailHeader } from "@/lib/mail-header";
import { fulfillmentLabel } from "@/lib/selling";
import { Resend } from "resend";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type OrderMailKind = "paid" | "reserved" | "ready" | "cancelled";

export type OrderMailInput = {
  kind: OrderMailKind;
  order: {
    id: string;
    item_name: string;
    quantity: number;
    charge_cents: number;
    service_fee_cents: number;
    fulfillment: string;
    buyer_email: string | null;
    status?: string;
  };
  vendorName: string;
  vendorSlug: string;
  stallEmail: string | null;
};

function orderUrl(vendorSlug: string, orderId: string) {
  return `${SITE_URL}/vendors/${vendorSlug}/orders/${orderId}`;
}

export function orderLetter(input: OrderMailInput, audience: "shopper" | "stall") {
  const price = formatPrice(input.order.charge_cents) ?? "";
  const service = formatPrice(input.order.service_fee_cents);
  const how = fulfillmentLabel(input.order.fulfillment);
  const url = orderUrl(input.vendorSlug, input.order.id);
  const lines =
    input.kind === "ready"
      ? input.order.status === "reserved"
        ? [
            `${input.order.item_name} is ready for pickup at ${input.vendorName}. Pay at the stall and show ID.`,
            `${input.order.quantity} · ${price} · ${how}`,
            url,
          ]
        : [
            `${input.order.item_name} is ready for pickup at ${input.vendorName}.`,
            service
              ? `${input.order.quantity} · ${price} plus ${service} service fee · ${how}`
              : `${input.order.quantity} · ${price} · ${how}`,
            url,
          ]
      : input.kind === "cancelled"
        ? [
            audience === "stall"
              ? `A shopper cancelled ${input.order.item_name}.`
              : `Your order at ${input.vendorName} is cancelled.`,
            service
              ? `${input.order.quantity} · ${price} plus ${service} service fee · ${how}`
              : `${input.order.quantity} · ${price} · ${how}`,
            url,
          ]
      : input.kind === "reserved"
        ? [
            audience === "stall"
              ? `A shopper reserved ${input.order.item_name}. They pay at the stall and show ID.`
              : `Your reservation at ${input.vendorName} is in. Pay at the stall and show ID. There is no card charge.`,
            `${input.order.quantity} · ${price} · ${how}`,
            url,
          ]
        : [
            audience === "stall"
              ? `A shopper paid for ${input.order.item_name}.`
              : `Your order at ${input.vendorName} is paid.`,
            service
              ? `${input.order.quantity} · ${price} plus ${service} service fee · ${how}`
              : `${input.order.quantity} · ${price} · ${how}`,
            url,
          ];
  const subject =
    input.kind === "ready"
      ? `${input.order.item_name} is ready for pickup`
      : input.kind === "cancelled"
        ? `Cancelled order for ${input.order.item_name}`
        : input.kind === "reserved"
          ? `Reservation for ${input.order.item_name}`
          : `Order for ${input.order.item_name}`;
  const text = lines.join("\n\n");
  const html = `<!doctype html>
<html><body style="margin:0;background:#F1EDE3;color:#141414;font-family:ui-sans-serif,system-ui,sans-serif">
<div style="max-width:32rem;margin:0 auto;padding:24px">
<p style="margin:0 0 8px;font-size:14px;color:#5e5a53">${escapeHtml(SITE_NAME)}</p>
${lines
  .map(
    (line, index) =>
      `<p style="margin:${index === 0 ? "0 0 16px" : "0 0 12px"};font-size:16px;line-height:1.5">${
        line === url ? `<a href="${escapeHtml(url)}" style="color:#141414">${escapeHtml(url)}</a>` : escapeHtml(line)
      }</p>`,
  )
  .join("")}
</div>
</body></html>`;
  return { subject: sanitizeMailHeader(subject), text, html };
}

async function deliver(to: string, letter: { subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !from || !to.includes("@")) return;
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: letter.subject,
      text: letter.text,
      html: letter.html,
    });
    if (error) console.error("order mail", error.name ?? "send");
  } catch (error) {
    console.error("order mail", error instanceof Error ? error.message : "send");
  }
}

export async function sendOrderMail(input: OrderMailInput) {
  const shopper = input.order.buyer_email;
  if (shopper) await deliver(shopper, orderLetter(input, "shopper"));
  if (input.kind !== "ready" && input.stallEmail) {
    await deliver(input.stallEmail, orderLetter(input, "stall"));
  }
}
