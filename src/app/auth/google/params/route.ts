import { resolveGoogleClientId } from "@/lib/google-oauth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = await resolveGoogleClientId();
  return NextResponse.json(
    { clientId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
