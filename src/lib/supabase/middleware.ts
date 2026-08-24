import { createServerClient } from "@supabase/ssr";
import { cookieLooksLikeSupabaseAuth } from "@/lib/supabase/auth-cookie";
import { safePath } from "@/lib/auth-redirect";
import { NextResponse, type NextRequest } from "next/server";

function loginRedirect(request: NextRequest) {
  const next = safePath(`${request.nextUrl.pathname}${request.nextUrl.search}`);
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(redirectUrl);
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
    if (!needsAuth) return supabaseResponse;
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
    return loginRedirect(request);
  }

  return supabaseResponse;
}
