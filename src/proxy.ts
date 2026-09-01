import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Search engines fetch the sitelinks SearchAction template literally, so
 * `/markets?q={search_term_string}` shows up in Search Console as a real URL.
 * Braces are never part of a genuine filter, so drop those params instead of
 * rendering a second copy of the page behind a canonical.
 */
function templatedParams(searchParams: URLSearchParams) {
  const named: string[] = [];
  searchParams.forEach((value, key) => {
    if (value.includes("{") || value.includes("}")) named.push(key);
  });
  return named;
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (request.method === "GET") {
    const templated = templatedParams(searchParams);
    if (templated.length) {
      const url = request.nextUrl.clone();
      for (const key of templated) url.searchParams.delete(key);
      return NextResponse.redirect(url, 308);
    }
  }

  if (pathname === "/auth/callback") {
    const url = request.nextUrl.clone();
    if (searchParams.has("token_hash")) {
      url.pathname = "/auth/confirm";
      return NextResponse.rewrite(url);
    }
    if (
      searchParams.has("code") ||
      searchParams.has("error") ||
      searchParams.has("error_description")
    ) {
      url.pathname = "/auth/pkce";
      return NextResponse.rewrite(url);
    }
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
