/** What the markets directory actually paints. Kept small so the page can be cached. */

export type FloorMarket = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  province: string;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  rating_avg: number | null;
  review_count: number;
  tags: string[];
  open: boolean;
  hours: string;
  nextOpen: string;
  sessions: Array<{ day: string; hours: string }>;
  vendorCount: number;
  neighbourhood: string;
  waitMinutes: number | null;
  dayNames: string[];
  indoor_outdoor: string | null;
};

export type FloorWeekSlot = {
  slug: string;
  hours: string;
  open: boolean;
};

export type FloorWeekGroup = {
  id: string;
  label: string;
  slots: FloorWeekSlot[];
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

export type FloorTaxonomySample = {
  name: string;
  href: string;
  priceCents: number | null;
  category: string;
};

export type FloorTaxonomy = {
  categories: string[];
  origins: string[];
  diets: string[];
  production: string[];
  samples: FloorTaxonomySample[];
};

/** Schedule rows the browser needs to decide what is open. No server clock. */
export type FloorSchedule = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  season_start: string | null;
  season_end: string | null;
  notes: string | null;
};

/** A market before the clock is applied. Hours and open state are derived in the browser. */
export type FloorMarketStatic = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  province: string;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  rating_avg: number | null;
  review_count: number;
  tags: string[];
  vendorCount: number;
  neighbourhood: string;
  indoor_outdoor: string | null;
  schedules: FloorSchedule[];
};

export type MarketsFloorBase = {
  renderedAt: number;
  markets: FloorMarketStatic[];
  roster: FloorRosterEntry[];
  taxonomyBySlug: Record<string, FloorTaxonomy>;
};

export type MarketsFloorView = {
  todayWeekday: number;
  fullWeek: FloorWeekGroup[];
  enrichedMarkets: FloorMarket[];
  roster: FloorRosterEntry[];
  taxonomyBySlug: Record<string, FloorTaxonomy>;
};
