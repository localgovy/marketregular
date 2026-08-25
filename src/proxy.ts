import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (
    pathname === "/auth/callback" &&
    (searchParams.has("code") ||
      searchParams.has("error") ||
      searchParams.has("error_description"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/pkce";
    return NextResponse.rewrite(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
