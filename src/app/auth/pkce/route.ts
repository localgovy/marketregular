import { AUTH_NEXT_COOKIE, callbackOrigin, safePath } from "@/lib/auth-redirect";
import type { LoginErrorKey } from "@/lib/public-error";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function redirectAway(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const next = safePath(
    request.nextUrl.searchParams.get("next") ?? request.cookies.get(AUTH_NEXT_COOKIE)?.value,
  );
  const origin = callbackOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const oauthError =
    request.nextUrl.searchParams.get("error_description") ??
    request.nextUrl.searchParams.get("error");

  const loginError = (key: LoginErrorKey) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", key);
    if (next !== "/account") url.searchParams.set("next", next);
    return redirectAway(url);
  };

  if (oauthError) return loginError("oauth");
  if (!code) return redirectAway(new URL(next, origin));

  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) {
    return loginError("session");
  }

  const redirectTo = new URL(next, origin);
  let response = redirectAway(redirectTo);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = redirectAway(redirectTo);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return loginError("session");
  return response;
}
