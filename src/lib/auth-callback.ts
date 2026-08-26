import { AUTH_NEXT_COOKIE, callbackOrigin, safePath } from "@/lib/auth-redirect";
import type { LoginErrorKey } from "@/lib/public-error";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export function authNextPath(request: NextRequest) {
  const raw =
    request.nextUrl.searchParams.get("next") ?? request.cookies.get(AUTH_NEXT_COOKIE)?.value ?? "";
  try {
    return safePath(decodeURIComponent(raw));
  } catch {
    return safePath(raw);
  }
}

export function authRedirect(request: NextRequest, dest: string | URL) {
  const origin = callbackOrigin(request);
  const url = dest instanceof URL ? dest : new URL(dest, origin);
  const response = NextResponse.redirect(url);
  response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

export function authLoginError(request: NextRequest, key: LoginErrorKey, next: string) {
  const origin = callbackOrigin(request);
  const url = new URL("/login", origin);
  url.searchParams.set("error", key);
  if (next !== "/account") url.searchParams.set("next", next);
  return authRedirect(request, url);
}

export function createAuthRouteClient(request: NextRequest, redirectTo: URL) {
  const url = supabaseUrl();
  const key = supabaseAnonKey();
  if (!url || !key) return { supabase: null, getResponse: () => authRedirect(request, redirectTo) };

  let response = authRedirect(request, redirectTo);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = authRedirect(request, redirectTo);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  return { supabase, getResponse: () => response };
}

const EMAIL_OTP_TYPES = new Set<string>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export function emailOtpType(value: string | null): EmailOtpType | null {
  if (!value || !EMAIL_OTP_TYPES.has(value)) return null;
  return value as EmailOtpType;
}
