"use server";

import { requireAdmin } from "@/lib/admin";
import { mustSetPassword } from "@/lib/password-gate";
import { parseCheckoutDetails, saleReady, VENDOR_SALES_OPEN } from "@/lib/selling";
import {
  confirmFeeCheckout,
  createStallAccount,
  startFeeCheckout,
  startStallCheckout as openStallCheckout,
  loadSellable,
} from "@/lib/stall-payments";
import { stripeChargesConfigured, stripeConnectConfigured } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/admin";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { isUuid, parseVendorPortal } from "@/lib/vendor-portal";
import { revalidatePublishedDirectory } from "@/lib/revalidate-directory";
import { redirect } from "next/navigation";

async function ownedListing(vendorId: string) {
  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user) return { error: "Sign in first." as const, user: null, listing: null };
  if (mustSetPassword(user.app_metadata)) {
    return { error: "Set a password first." as const, user: null, listing: null };
  }
  if (!isUuid(vendorId)) return { error: "That stall is missing." as const, user: null, listing: null };
  const { data, error } = await supabase.rpc("owns_vendor", { p_id: vendorId });
  if (error || data !== true) {
    return { error: "That stall is not yours." as const, user: null, listing: null };
  }
  const portal = await supabase.rpc("my_vendor_portal");
  const listing = parseVendorPortal(portal.data).find((row) => row.id === vendorId) ?? null;
  if (!listing) return { error: "That stall is not yours." as const, user: null, listing: null };
  return { error: null, user, listing };
}

export async function setVendorSelling(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!supabase) return { error: "Admins only." };
  const id = String(formData.get("vendor_id") ?? "");
  if (!isUuid(id)) return { error: "That stall is missing." };
  const approved = formData.get("selling_approved") === "on";
  const { data, error } = await supabase
    .from("vendors")
    .update({ selling_approved: approved })
    .eq("id", id)
    .select("slug")
    .maybeSingle();
  if (error || !data) return { error: "Could not update selling." };
  revalidatePublishedDirectory([`/vendors/${data.slug}`, `/admin/vendors/${id}`, `/vendor/${id}`]);
  return { error: null, message: approved ? "Selling is on." : "Selling is off." };
}

const SALES_CLOSED = "Listing for sale is closed for now.";

export async function beginStallPayments(formData: FormData) {
  if (!VENDOR_SALES_OPEN) return { error: SALES_CLOSED };
  const vendorId = String(formData.get("vendor_id") ?? "");
  const gate = await ownedListing(vendorId);
  if (!gate.listing || !gate.user) return { error: gate.error ?? "That stall is not yours." };
  if (!gate.listing.selling_approved) return { error: "Selling is not approved for this stall." };
  if (!stripeConnectConfigured()) return { error: "Payments are not available yet." };
  if (!gate.user.email) return { error: "This account needs an email before payments can start." };
  try {
    const created = await createStallAccount({
      vendorId,
      displayName: gate.listing.name,
      email: gate.user.email,
    });
    if (created.error) return { error: created.error };
  } catch (err) {
    console.error("stall account", err instanceof Error ? err.message : "stripe");
    return { error: "Could not start payments." };
  }
  revalidatePublishedDirectory([`/vendor/${vendorId}`, `/vendors/${gate.listing.slug}`]);
  return { error: null, message: "Payment setup is ready." };
}

export async function payStallFee(formData: FormData) {
  if (!VENDOR_SALES_OPEN) return { error: SALES_CLOSED };
  const vendorId = String(formData.get("vendor_id") ?? "");
  const gate = await ownedListing(vendorId);
  if (!gate.listing || !gate.user) return { error: gate.error ?? "That stall is not yours." };
  if (!stripeChargesConfigured()) return { error: "Payments are not available yet." };
  const opened = await startFeeCheckout(
    vendorId,
    gate.listing.fee_balance_cents,
    gate.user.email ?? null,
  );
  if (opened.error || !opened.url) return { error: opened.error ?? "Could not start that payment." };
  redirect(opened.url);
}

export async function settleStallFeeReturn(vendorId: string, sessionId: string) {
  const gate = await ownedListing(vendorId);
  if (!gate.listing) return;
  if (!sessionId.startsWith("cs_")) return;
  try {
    await confirmFeeCheckout(vendorId, sessionId);
  } catch (err) {
    console.error("stall fee confirm", err instanceof Error ? err.message : "stripe");
  }
}

export async function placeStallOrder(formData: FormData): Promise<{ error: string | null }> {
  if (!VENDOR_SALES_OPEN) return { error: SALES_CLOSED };
  const { user } = await createAuthedServerClient();
  if (!user) return { error: "Sign in first." };
  if (!stripeChargesConfigured()) return { error: "Payments are not available yet." };
  const slug = String(formData.get("vendor_slug") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  if (!isUuid(itemId) || !/^[a-z0-9-]+$/.test(slug)) return { error: "That item is missing." };
  const sellable = await loadSellable(slug, itemId);
  if (!sellable) return { error: "That item is not for sale." };
  const shownPrice = String(formData.get("unit_price_cents") ?? "");
  if (!/^\d+$/.test(shownPrice) || Number(shownPrice) !== sellable.price_cents) {
    return { error: "The price changed. Refresh and try again." };
  }
  const parsed = parseCheckoutDetails({
    fulfillment: String(formData.get("fulfillment") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    note: String(formData.get("note") ?? ""),
    deliveryName: String(formData.get("delivery_name") ?? ""),
    line1: String(formData.get("line1") ?? ""),
    city: String(formData.get("city") ?? ""),
    region: String(formData.get("region") ?? ""),
    postal: String(formData.get("postal") ?? ""),
    offers: {
      delivery: sellable.offer_delivery,
      pickup: sellable.offer_pickup,
      preorder: sellable.offer_preorder,
    },
  });
  if (parsed.error != null) return { error: parsed.error };
  const ready = saleReady({
    forSale: true,
    priceCents: sellable.price_cents,
    offers: {
      delivery: sellable.offer_delivery,
      pickup: sellable.offer_pickup,
      preorder: sellable.offer_preorder,
    },
  });
  if (ready) return { error: ready };
  const opened = await openStallCheckout({
    sellable,
    buyerId: user.id,
    email: user.email ?? null,
    details: parsed.details,
  });
  if (opened.error || !("url" in opened) || !opened.url) {
    return { error: opened.error ?? "Could not start that payment." };
  }
  redirect(opened.url);
}

export async function loadBuyerOrders(userId: string) {
  const { user } = await createAuthedServerClient();
  if (!user || user.id !== userId) return [];
  const db = createServiceClient();
  if (!db) return [];
  const { data, error } = await db
    .from("orders")
    .select("id, item_name, quantity, charge_cents, fulfillment, status, paid_at, vendor_id, vendors(name, slug)")
    .eq("buyer_id", userId)
    .in("status", ["paid", "partially_refunded", "refunded"])
    .order("paid_at", { ascending: false })
    .limit(40);
  if (error || !data) return [];
  return data.flatMap((row) => {
    const joined = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    const name =
      joined && typeof joined === "object" && "name" in joined && typeof joined.name === "string"
        ? joined.name
        : "Stall";
    const slug =
      joined && typeof joined === "object" && "slug" in joined && typeof joined.slug === "string"
        ? joined.slug
        : "";
    return [
      {
        id: String(row.id),
        itemName: String(row.item_name),
        quantity: Number(row.quantity),
        chargeCents: Number(row.charge_cents),
        fulfillment: String(row.fulfillment),
        status: String(row.status),
        paidAt: typeof row.paid_at === "string" ? row.paid_at : null,
        vendorName: name,
        vendorSlug: slug,
      },
    ];
  });
}
