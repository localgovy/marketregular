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
import { FIND_PAGES } from "@/data/find-pages";
import { listStalls } from "@/lib/data/catalog";
import { EMPTY_PRODUCT_PHOTOS, listProductPhotos } from "@/lib/data/product-photos";
import { sortTagsForDisplay, tagLabel } from "@/lib/find-paths";
import { listingMarkSrc } from "@/lib/format";
import { productsBrowsePath } from "@/lib/product-browse-href";
import { createServiceClient } from "@/lib/supabase/admin";
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

export type FloorRosterEntry = {
  marketSlug: string;
  vendorSlug: string;
  name: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  tags: string[];
};

export type MarketsPreviewData = HomePreviewData & {
  enrichedMarkets: EnrichedMarketRow[];
  saturdayOpenCount: number;
  saturdayStallCount: number;
  roster: FloorRosterEntry[];
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

  const roster: FloorRosterEntry[] = [];
  for (const stall of stalls) {
    const market = rawMarketById.get(stall.market_id);
    if (!market) continue;
    const vendor = rawVendorById.get(stall.id);
    roster.push({
      marketSlug: market.slug,
      vendorSlug: stall.slug,
      name: stall.name,
      logoUrl: listingMarkSrc(vendor?.logo_url),
      ratingAvg: vendor?.rating_avg ?? null,
      reviewCount: vendor?.review_count ?? 0,
      tags: vendorProductTags(stall.name, vendor?.tags),
    });
  }

  return {
    ...base,
    enrichedMarkets,
    saturdayOpenCount,
    saturdayStallCount,
    roster,
  };
}

export type VendorTaxonomySample = {
  name: string;
  href: string;
  priceCents: number | null;
  category: string;
};

/** Real menu categories and classifier facets for one published vendor. */
export type VendorTaxonomy = {
  categories: string[];
  origins: string[];
  diets: string[];
  production: string[];
  samples: VendorTaxonomySample[];
};

export type MarketsFloorData = MarketsPreviewData & {
  taxonomyBySlug: Record<string, VendorTaxonomy>;
};

const TAXONOMY_PAGE = 1000;
const TAXONOMY_PAGE_CAP = 20;

type MenuTaxRow = {
  id: string;
  vendor_id: string;
  name: string;
  price_cents: number | null;
  product_category: string | null;
  product_slug: string | null;
};

type AssignRow = {
  menu_id: string;
  classifier_slug: string;
};

function sampleHref(productSlug: string | null, category: string) {
  if (productSlug) {
    const page = FIND_PAGES.find((entry) => entry.matchSlugs.includes(productSlug));
    if (page) return `/find/${page.slug}`;
  }
  const byCategory = FIND_PAGES.find((entry) => entry.category === category);
  if (byCategory) return `/find/${byCategory.slug}`;
  return productsBrowsePath(category, "featured");
}

function rememberSample(
  samples: VendorTaxonomySample[],
  row: MenuTaxRow,
) {
  const category = row.product_category;
  const name = row.name?.trim();
  if (!category || category === "other" || !name) return;
  if (samples.some((sample) => sample.name === name)) return;
  const next: VendorTaxonomySample = {
    name,
    href: sampleHref(row.product_slug, category),
    priceCents: row.price_cents,
    category,
  };
  if (samples.length < 2) {
    samples.push(next);
    return;
  }
  if (next.priceCents == null) return;
  const replace = samples.findIndex((sample) => sample.priceCents == null);
  if (replace >= 0) samples[replace] = next;
}

async function readPublishedMenus(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
) {
  const rows: MenuTaxRow[] = [];
  for (let page = 0; page < TAXONOMY_PAGE_CAP; page += 1) {
    const from = page * TAXONOMY_PAGE;
    const { data, error } = await supabase
      .from("published_menus")
      .select("id, vendor_id, name, price_cents, product_category, product_slug")
      .order("id")
      .range(from, from + TAXONOMY_PAGE - 1);
    if (error || !data?.length) break;
    rows.push(...(data as MenuTaxRow[]));
    if (data.length < TAXONOMY_PAGE) break;
  }
  return rows;
}

async function readFacetAssignments(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
) {
  const rows: AssignRow[] = [];
  for (let page = 0; page < TAXONOMY_PAGE_CAP; page += 1) {
    const from = page * TAXONOMY_PAGE;
    const { data, error } = await supabase
      .from("vendor_menu_classifier_assignments")
      .select("menu_id, classifier_slug")
      .or(
        "classifier_slug.like.origin.*,classifier_slug.like.diet.*,classifier_slug.like.production.*",
      )
      .order("menu_id")
      .order("classifier_slug")
      .range(from, from + TAXONOMY_PAGE - 1);
    if (error || !data?.length) break;
    rows.push(...(data as AssignRow[]));
    if (data.length < TAXONOMY_PAGE) break;
  }
  return rows;
}

async function loadTaxonomyBySlug(): Promise<Record<string, VendorTaxonomy>> {
  const supabase = createServiceClient();
  if (!supabase) return {};
  try {
    const [{ data: vendorRows, error: vendorError }, menus, assignments] = await Promise.all([
      supabase.from("vendors").select("id, slug").eq("status", "published"),
      readPublishedMenus(supabase),
      readFacetAssignments(supabase),
    ]);
    if (vendorError || !vendorRows) return {};

    const slugById = new Map<string, string>();
    for (const row of vendorRows as Array<{ id: string; slug: string }>) {
      if (row.id && row.slug) slugById.set(row.id, row.slug);
    }

    const buckets = new Map<
      string,
      {
        categories: Set<string>;
        origins: Set<string>;
        diets: Set<string>;
        production: Set<string>;
        samples: VendorTaxonomySample[];
      }
    >();

    function bucketFor(slug: string) {
      const existing = buckets.get(slug);
      if (existing) return existing;
      const created = {
        categories: new Set<string>(),
        origins: new Set<string>(),
        diets: new Set<string>(),
        production: new Set<string>(),
        samples: [] as VendorTaxonomySample[],
      };
      buckets.set(slug, created);
      return created;
    }

    const vendorByMenu = new Map<string, string>();
    for (const row of menus) {
      const slug = slugById.get(row.vendor_id);
      if (!slug) continue;
      vendorByMenu.set(row.id, slug);
      const bucket = bucketFor(slug);
      if (row.product_category && row.product_category !== "other") {
        bucket.categories.add(row.product_category);
      }
      rememberSample(bucket.samples, row);
    }

    for (const row of assignments) {
      const slug = vendorByMenu.get(row.menu_id);
      const classifier = row.classifier_slug;
      if (!slug || !classifier) continue;
      const bucket = bucketFor(slug);
      if (classifier.startsWith("origin.")) bucket.origins.add(classifier.slice("origin.".length));
      else if (classifier.startsWith("diet.")) bucket.diets.add(classifier.slice("diet.".length));
      else if (classifier.startsWith("production.")) {
        bucket.production.add(classifier.slice("production.".length));
      }
    }

    const taxonomy: Record<string, VendorTaxonomy> = {};
    for (const [slug, bucket] of buckets) {
      if (
        bucket.categories.size === 0 &&
        bucket.origins.size === 0 &&
        bucket.diets.size === 0 &&
        bucket.production.size === 0
      ) {
        continue;
      }
      taxonomy[slug] = {
        categories: [...bucket.categories],
        origins: [...bucket.origins],
        diets: [...bucket.diets],
        production: [...bucket.production],
        samples: bucket.samples,
      };
    }
    return taxonomy;
  } catch {
    return {};
  }
}

export async function loadMarketsFloorData(): Promise<MarketsFloorData> {
  const [preview, taxonomyBySlug] = await Promise.all([
    loadMarketsPreviewData(),
    loadTaxonomyBySlug(),
  ]);
  return { ...preview, taxonomyBySlug };
}
