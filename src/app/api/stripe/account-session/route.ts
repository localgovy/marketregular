import { NextResponse } from "next/server";
import { createAccountSession } from "@/lib/stall-payments";
import { VENDOR_SALES_OPEN } from "@/lib/selling";
import { stripeConnectConfigured } from "@/lib/stripe";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { isUuid, parseVendorPortal } from "@/lib/vendor-portal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!VENDOR_SALES_OPEN) {
    return NextResponse.json({ error: "Listing for sale is closed for now." }, { status: 403 });
  }
  if (!stripeConnectConfigured()) {
    return NextResponse.json({ error: "Payments are not available yet." }, { status: 503 });
  }
  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  let vendorId = "";
  try {
    const body = (await request.json()) as { vendorId?: unknown };
    if (typeof body.vendorId === "string") vendorId = body.vendorId;
  } catch {
    return NextResponse.json({ error: "That stall is missing." }, { status: 400 });
  }
  if (!isUuid(vendorId)) return NextResponse.json({ error: "That stall is missing." }, { status: 400 });
  const { data: owns, error: ownsError } = await supabase.rpc("owns_vendor", { p_id: vendorId });
  if (ownsError || owns !== true) {
    return NextResponse.json({ error: "That stall is not yours." }, { status: 403 });
  }
  const portal = await supabase.rpc("my_vendor_portal");
  const listing = parseVendorPortal(portal.data).find((row) => row.id === vendorId);
  if (!listing?.selling_approved || !listing.payments_started) {
    return NextResponse.json({ error: "Payments are not set up." }, { status: 403 });
  }
  try {
    const clientSecret = await createAccountSession(vendorId);
    if (!clientSecret) return NextResponse.json({ error: "Could not open payments." }, { status: 503 });
    return NextResponse.json({ client_secret: clientSecret });
  } catch (err) {
    console.error("account session", err instanceof Error ? err.message : "stripe");
    return NextResponse.json({ error: "Could not open payments." }, { status: 503 });
  }
}
