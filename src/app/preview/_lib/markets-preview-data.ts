import "server-only";

import {
  loadHomePreviewData,
  type HomePreviewData,
  type PreviewAisleCard,
  type PreviewDayGroup,
  type PreviewMarketRow,
  type PreviewMarketSlot,
  type PreviewNeighbourhoodCircuit,
  type PreviewVendorSpotlight,
} from "@/app/preview/_lib/home-preview-data";
import { listStalls } from "@/lib/data/catalog";
import { EMPTY_PRODUCT_PHOTOS, listProductPhotos } from "@/lib/data/product-photos";
import { sortTagsForDisplay, tagLabel } from "@/lib/find-paths";
import { listingMarkSrc } from "@/lib/format";
import { vendorProductTags } from "@/lib/vendor-tags";

export type {
  PreviewAisleCard,
  PreviewDayGroup,
  PreviewMarketRow,
  PreviewMarketSlot,
  PreviewNeighbourhoodCircuit,
  PreviewVendorSpotlight,
};

export type EnrichedMarketStall = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  stall: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  categoryId: string;
  categoryLabel: string;
  itemName: string;
  itemHref: string;
  priceCents: number | null;
};

export type EnrichedMarketRow = PreviewMarketRow & {
  about: string | null;
  bannerPhotoUrl: string | null;
  bannerPhotoAlt: string;
  primaryCategoryLabel: string;
  displayTags: string[];
  openSaturday: boolean;
  saturdayHours: string | null;
  topStalls: EnrichedMarketStall[];
};

export type MarketsPreviewData = HomePreviewData & {
  enrichedMarkets: EnrichedMarketRow[];
  saturdayOpenCount: number;
  saturdayStallCount: number;
};

const TAG_TO_CATEGORY: Record<string, { id: string; label: string; item: string; href: string; price: number }> = {
  bakery: { id: "bread-and-bakery", label: "Bread and bakery", item: "Country sourdough loaf", href: "/find/sourdough-toronto", price: 950 },
  bread: { id: "bread-and-bakery", label: "Bread and bakery", item: "Artisan sourdough boule", href: "/find/bread-toronto", price: 900 },
  sweets: { id: "pies-and-sweets", label: "Pies and sweets", item: "Ontario butter tarts (6-pack)", href: "/find/butter-tarts-toronto", price: 1400 },
  "prepared-food": { id: "prepared-foods", label: "Prepared food", item: "Wood-fired market flatbread", href: "/find/pizza-toronto", price: 1500 },
  produce: { id: "vegetables", label: "Vegetables", item: "bunch heirloom carrots & greens", href: "/find/carrots-toronto", price: 650 },
  organic: { id: "vegetables", label: "Vegetables", item: "Organic field tomatoes", href: "/find/tomatoes-toronto", price: 750 },
  fruit: { id: "apples-and-fruit", label: "Fruit", item: "Orchard Honeycrisp apples", href: "/find/apples-toronto", price: 850 },
  meat: { id: "meat-and-turkey", label: "Meat", item: "Pasture-raised farm sausages", href: "/find/sausages-toronto", price: 1650 },
  poultry: { id: "meat-and-turkey", label: "Meat", item: "Pasture-raised whole chicken", href: "/find/chicken-toronto", price: 2400 },
  seafood: { id: "seafood", label: "Seafood", item: "Georgian Bay smoked trout", href: "/find/fish-toronto", price: 1800 },
  eggs: { id: "eggs", label: "Eggs", item: "Free-run farm eggs (dozen)", href: "/find/eggs-toronto", price: 850 },
  cheese: { id: "cheese-and-dairy", label: "Cheese and dairy", item: "Aged farmstead clothbound cheddar", href: "/find/cheese-toronto", price: 1450 },
  dairy: { id: "cheese-and-dairy", label: "Cheese and dairy", item: "Small-batch cultured butter", href: "/find/cheese-toronto", price: 1100 },
  honey: { id: "honey", label: "Honey", item: "Raw Ontario wildflower honey", href: "/find/honey-toronto", price: 1500 },
  maple: { id: "maple", label: "Maple", item: "Wood-fired amber maple syrup", href: "/find/maple-syrup-toronto", price: 1800 },
  preserves: { id: "preserves-and-sauces", label: "Preserves and sauces", item: "Small-batch seasonal fruit preserve", href: "/find/jam-toronto", price: 1150 },
  coffee: { id: "coffee-and-tea", label: "Coffee and tea", item: "Small-batch roasted whole bean coffee", href: "/find/coffee-toronto", price: 1800 },
  tea: { id: "coffee-and-tea", label: "Coffee and tea", item: "Botanical loose-leaf tea blend", href: "/find/tea-toronto", price: 1400 },
};

export async function loadMarketsPreviewData(): Promise<MarketsPreviewData> {
  const [base, stalls, photos] = await Promise.all([
    loadHomePreviewData(),
    listStalls(),
    listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
  ]);

  const rawMarketById = new Map(base.rawMarkets.map((m) => [m.id, m]));
  const rawVendorById = new Map(base.rawVendors.map((v) => [v.id, v]));
  const spotlightBySlug = new Map(base.vendorSpotlights.map((s) => [s.slug, s]));
  const aislePhotoById = new Map(base.aisles.map((a) => [a.id, { url: a.photoUrl, alt: a.photoAlt ?? a.label }]));

  const stallsByMarketId = new Map<string, typeof stalls>();
  for (const s of stalls) {
    const list = stallsByMarketId.get(s.market_id) ?? [];
    list.push(s);
    stallsByMarketId.set(s.market_id, list);
  }

  let saturdayOpenCount = 0;
  let saturdayStallCount = 0;

  const enrichedMarkets: EnrichedMarketRow[] = base.directoryMarkets.map((m, idx) => {
    const rawMarket = rawMarketById.get(m.id);
    const marketStalls = stallsByMarketId.get(m.id) ?? [];

    const topStalls: EnrichedMarketStall[] = marketStalls
      .map((st) => {
        const v = rawVendorById.get(st.id);
        const spot = spotlightBySlug.get(st.slug);
        const tags = vendorProductTags(st.name, v?.tags);
        const fallbackTag = tags.find((t) => TAG_TO_CATEGORY[t]) ?? "produce";
        const fallbackSpec = TAG_TO_CATEGORY[fallbackTag] ?? TAG_TO_CATEGORY.produce!;

        const firstItem = spot?.items[0];
        const categoryId = spot?.aisleIds[0] ?? fallbackSpec.id;
        const categoryLabel = spot?.primaryAisleLabel ?? fallbackSpec.label;

        return {
          id: st.id,
          slug: st.slug,
          name: st.name,
          logoUrl: listingMarkSrc(v?.logo_url ?? spot?.logoUrl),
          stall: st.stall,
          ratingAvg: v?.rating_avg ?? spot?.ratingAvg ?? null,
          reviewCount: v?.review_count ?? spot?.reviewCount ?? 0,
          categoryId,
          categoryLabel,
          itemName: firstItem?.name ?? fallbackSpec.item,
          itemHref: firstItem?.href ?? fallbackSpec.href,
          priceCents: firstItem?.priceCents ?? fallbackSpec.price,
        };
      })
      .sort(
        (a, b) =>
          Number(Boolean(b.logoUrl)) - Number(Boolean(a.logoUrl)) ||
          (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 8);

    const satSession = m.sessions.find((s) => s.day === "Sat");
    const openSaturday = Boolean(satSession || m.dayNames.some((d) => d.startsWith("Sat")));
    if (openSaturday) {
      saturdayOpenCount += 1;
      saturdayStallCount += m.vendorCount;
    }

    const marketTags = sortTagsForDisplay(m.tags);
    const firstTagMatch = marketTags.map((t) => TAG_TO_CATEGORY[t]).find(Boolean);
    const primaryCategoryId =
      topStalls[0]?.categoryId ??
      firstTagMatch?.id ??
      base.aisles[idx % Math.max(1, base.aisles.length)]?.id ??
      "vegetables";
    const primaryCategoryLabel =
      topStalls[0]?.categoryLabel ??
      firstTagMatch?.label ??
      "Fresh produce & market goods";

    const photoObj =
      aislePhotoById.get(primaryCategoryId) ??
      (photos.aisle[primaryCategoryId]
        ? { url: photos.aisle[primaryCategoryId]!.url, alt: photos.aisle[primaryCategoryId]!.alt }
        : null) ??
      (base.aisles[0]?.photoUrl ? { url: base.aisles[0].photoUrl, alt: base.aisles[0].label } : null);

    return {
      ...m,
      about:
        rawMarket?.about ??
        `Weekly farmers' market in ${m.neighbourhood} featuring ${m.vendorCount > 0 ? `${m.vendorCount} local growers, bakers, and makers` : "local Ontario growers and food makers"}.`,
      bannerPhotoUrl: photoObj?.url ?? null,
      bannerPhotoAlt: photoObj?.alt ?? primaryCategoryLabel,
      primaryCategoryLabel,
      displayTags: marketTags.slice(0, 4).map((t) => tagLabel(t)),
      openSaturday,
      saturdayHours: satSession?.hours ?? m.hours ?? "8 AM–2 PM",
      topStalls,
    };
  });

  return {
    ...base,
    enrichedMarkets,
    saturdayOpenCount,
    saturdayStallCount,
  };
}
