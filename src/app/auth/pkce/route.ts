import {
  authLoginError,
  authNextPath,
  authRedirect,
  createAuthRouteClient,
} from "@/lib/auth-callback";
import { callbackOrigin } from "@/lib/auth-redirect";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const next = authNextPath(request);
  const origin = callbackOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const oauthError =
    request.nextUrl.searchParams.get("error_description") ??
    request.nextUrl.searchParams.get("error");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");

  if (oauthError) return authLoginError(request, "oauth", next);

  if (tokenHash && !code) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }

  const redirectTo = new URL(next, origin);
  if (!code) {
    return authRedirect(request, redirectTo);
  }

  const { supabase, getResponse } = createAuthRouteClient(request, redirectTo);
  if (!supabase) return authLoginError(request, "session", next);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) return getResponse();
  console.error("auth.exchange", error.code ?? "unknown");
  if (tokenHash) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }
  return authLoginError(request, "session", next);
}
