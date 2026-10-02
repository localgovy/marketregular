import { NextResponse } from "next/server";
import { searchProducts, searchVendorsByName } from "@/lib/data/product-search";
import { takeCatalogSlot } from "@/lib/mail-limit";
import { assertPublicSearchPayload } from "@/lib/product-hits";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await takeCatalogSlot())) {
    return NextResponse.json({ error: "Too many searches." }, { status: 429 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const [products, vendors] = await Promise.all([
    searchProducts({ q }),
    searchVendorsByName(q, 8),
  ]);
  const seen = new Set(products.map((hit) => hit.vendorSlug));
  const body = {
    products: products.slice(0, 8),
    vendors: vendors.filter((vendor) => !seen.has(vendor.slug)).slice(0, 8),
  };
  assertPublicSearchPayload(body);
  return NextResponse.json(body);
}
