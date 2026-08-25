import { loadMyProfile } from "@/lib/my-profile";
import { cookieLooksLikeSupabaseAuth } from "@/lib/supabase/auth-cookie";
import { onboardingExemptPath, onboardingHref } from "@/lib/onboarding";
import { safePath } from "@/lib/auth-redirect";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function loginRedirect(request: NextRequest) {
  const next = safePath(`${request.nextUrl.pathname}${request.nextUrl.search}`);
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(redirectUrl);
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return supabaseResponse;

  const path = request.nextUrl.pathname;
  const needsAuth = path.startsWith("/account") || path.startsWith("/admin");
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookieLooksLikeSupabaseAuth(cookie.name));

  if (!hasAuthCookie) {
    if (!needsAuth && path !== "/onboarding") return supabaseResponse;
    if (path === "/onboarding") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "?next=%2Fonboarding";
      return NextResponse.redirect(redirectUrl);
    }
    return loginRedirect(request);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (needsAuth && !user) {
    return copyCookies(supabaseResponse, loginRedirect(request));
  }

  if (user && !onboardingExemptPath(path)) {
    const { profile, error } = await loadMyProfile(supabase);
    if (!error && !profile?.onboarded_at) {
      const dest = new URL(onboardingHref(`${path}${request.nextUrl.search}`), request.nextUrl.origin);
      return copyCookies(supabaseResponse, NextResponse.redirect(dest));
    }
  }

  return supabaseResponse;
}
