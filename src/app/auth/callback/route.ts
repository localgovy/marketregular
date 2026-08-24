import { AUTH_NEXT_COOKIE, callbackOrigin, safePath } from "@/lib/auth-redirect";
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

  const loginError = (message: string) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", message.slice(0, 280));
    if (next !== "/account") url.searchParams.set("next", next);
    return redirectAway(url);
  };

  if (oauthError) return loginError(oauthError);
  if (!code) return redirectAway(new URL(next, origin));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return loginError("Supabase is not configured yet.");
  }

  const redirectTo = new URL(next, origin);
  let response = redirectAway(redirectTo);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
  if (error) return loginError(error.message);
  return response;
}
