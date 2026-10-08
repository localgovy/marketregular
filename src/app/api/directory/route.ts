import { NextResponse } from "next/server";
import { getDirectoryView } from "@/lib/directory-view";
import { boundedDirectoryKey, marketsSearchFromSearchParams } from "@/lib/find-paths";

const PUBLIC_CACHE = "public, max-age=120, s-maxage=120, stale-while-revalidate=300";

function withinLimits(params: URLSearchParams) {
  const tags = params.getAll("tag");
  const areas = params.getAll("area");
  const days = params.getAll("weekday");
  if (tags.length > 24 || areas.length > 24 || days.length > 7) return false;
  if (tags.some((tag) => tag.length > 80)) return false;
  if (areas.some((area) => area.length > 80)) return false;
  const q = params.get("q");
  if (q && q.length > 200) return false;
  const lat = params.get("lat");
  const lng = params.get("lng");
  if ((lat && lat.length > 32) || (lng && lng.length > 32)) return false;
  const setup = params.get("setup");
  if (setup && setup.length > 40) return false;
  const sort = params.get("sort");
  if (sort && sort.length > 20) return false;
  return true;
}

/** Public first page of a directory filter. Paging stays on the catalog slot. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (!withinLimits(params)) {
    return NextResponse.json({ error: "Invalid search." }, { status: 400 });
  }
  const search = marketsSearchFromSearchParams(params);
  try {
    const view = await getDirectoryView(search);
    const cache = boundedDirectoryKey(search) ? PUBLIC_CACHE : "private, no-store";
    return NextResponse.json(view, { headers: { "Cache-Control": cache } });
  } catch {
    return NextResponse.json({ error: "Couldn't load markets." }, { status: 500 });
  }
}
