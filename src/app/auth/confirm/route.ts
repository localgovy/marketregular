import {
  authLoginError,
  authNextPath,
  createAuthRouteClient,
  emailOtpType,
} from "@/lib/auth-callback";
import { callbackOrigin } from "@/lib/auth-redirect";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const next = authNextPath(request);
  const origin = callbackOrigin(request);
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = emailOtpType(request.nextUrl.searchParams.get("type"));

  if (!tokenHash || !type) {
    return authLoginError(request, "session", next);
  }

  const redirectTo = new URL(next, origin);
  const { supabase, getResponse } = createAuthRouteClient(request, redirectTo);
  if (!supabase) return authLoginError(request, "session", next);

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    console.error("auth.verifyOtp", error.code ?? "unknown");
    return authLoginError(request, "session", next);
  }
  return getResponse();
}
