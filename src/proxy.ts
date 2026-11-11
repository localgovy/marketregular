import { listingRedirectDestination } from "@/data/listing-redirects";
import { isAbusiveCrawler, isSpoofedBrowserSearch } from "@/lib/abusive-crawler";
import { parseListingPath } from "@/lib/listing-alias-lookup";
import { parseCatalogueSort } from "@/lib/product-browse-href";
import { canonicalProductPath, parseAisle } from "@/lib/product-catalogue";
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Search engines fetch the sitelinks SearchAction template literally, so
 * `/markets?q={search_term_string}` shows up in Search Console as a real URL.
 * Braces are never part of a genuine filter, so drop those params instead of
 * rendering a second copy of the page behind a canonical.
 *
 * `/markets?q=bread` is a real directory search (canonical still `/markets`).
 * Sitelinks SearchAction itself points at `/products?q={search_term_string}`.
 */
function templatedParams(searchParams: URLSearchParams) {
  const named: string[] = [];
  searchParams.forEach((value, key) => {
    if (value.includes("{") || value.includes("}")) named.push(key);
  });
  return named;
}

function dayParam(value: string) {
  if (!value) return null;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  return day;
}

/**
 * /products stays one cached catalogue. A query or a filter is either a
 * redirect to the canonical URL or a rewrite onto the search or browse route.
 * Unknown markets are resolved on the search route, before it loads results.
 */
function productHop(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/products") return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const q = searchParams.get("q")?.trim() ?? "";
  const openRaw = searchParams.get("open")?.trim() ?? "";
  const market = searchParams.get("market")?.trim() ?? "";
  const dayRaw = searchParams.get("day")?.trim() ?? "";
  const aisleRaw = searchParams.get("aisle")?.trim() ?? "";
  const sortRaw = searchParams.get("sort")?.trim() ?? "";
  const day = dayParam(dayRaw);
  const canonical = canonicalProductPath({
    q,
    openRaw,
    openToday: openRaw === "1",
    market,
    marketRaw: market,
    dayRaw,
    day,
    aisleRaw,
    sortRaw,
  });
  if (canonical) {
    const url = request.nextUrl.clone();
    const dest = new URL(canonical, request.nextUrl.origin);
    url.pathname = dest.pathname;
    url.search = dest.search;
    return NextResponse.redirect(url, 308);
  }
  if (!q && !openRaw && !market && !dayRaw && !aisleRaw && !sortRaw) return null;
  const url = request.nextUrl.clone();
  if (q || openRaw || market || dayRaw) {
    url.pathname = "/products/search";
    url.search = "";
    if (q) url.searchParams.set("q", q);
    if (openRaw) url.searchParams.set("open", openRaw);
    if (market) url.searchParams.set("market", market);
    if (dayRaw) url.searchParams.set("day", dayRaw);
    if (aisleRaw) url.searchParams.set("aisle", aisleRaw);
    if (sortRaw) url.searchParams.set("sort", sortRaw);
    return NextResponse.rewrite(url);
  }
  const aisle = parseAisle(aisleRaw) ?? "all";
  url.pathname = `/products/browse/${aisle}/${parseCatalogueSort(sortRaw)}`;
  return NextResponse.rewrite(url);
}

function isProductSearchRequest(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/products/search" || pathname.startsWith("/products/search/")) {
    return true;
  }
  if (pathname !== "/products") return false;
  return Boolean(
    searchParams.get("q")?.trim() ||
      searchParams.get("open")?.trim() ||
      searchParams.get("market")?.trim() ||
      searchParams.get("day")?.trim(),
  );
}

export async function proxy(request: NextRequest) {
  if (isAbusiveCrawler(request.headers.get("user-agent"))) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "cache-control": "no-store" },
    });
  }

  const { pathname, searchParams } = request.nextUrl;

  if (
    process.env.NODE_ENV === "production" &&
    (pathname === "/preview" || pathname.startsWith("/preview/"))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/preview-unavailable";
    return NextResponse.rewrite(url);
  }

  if (request.method === "GET" || request.method === "HEAD") {
    const templated = templatedParams(searchParams);
    if (templated.length) {
      const url = request.nextUrl.clone();
      for (const key of templated) url.searchParams.delete(key);
      return NextResponse.redirect(url, 308);
    }
    // Middleware can run before next.config redirects. Keep renamed slugs
    // single-hop even in that order. Live alias rows are merged at build time.
    if (parseListingPath(pathname)) {
      const dest = listingRedirectDestination(pathname);
      if (dest && dest !== pathname) {
        const url = request.nextUrl.clone();
        url.pathname = dest;
        return NextResponse.redirect(url, 308);
      }
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
  const product = productHop(request);
  if (product?.status === 308) return product;
  if (isProductSearchRequest(request) && isSpoofedBrowserSearch(request.headers)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "cache-control": "no-store" },
    });
  }
  const session = await updateSession(request);
  if (!product || session.headers.get("location")) return session;
  for (const cookie of session.headers.getSetCookie()) product.headers.append("set-cookie", cookie);
  return product;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|webmanifest|avif|mp4|mjs|js|css|map|woff2?|ttf|otf)$).*)",
  ],
};
