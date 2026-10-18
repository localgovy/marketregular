export type UserRole = "user" | "vendor" | "admin";
export type ListingStatus = "draft" | "published";
export type ClaimStatus = "pending" | "approved" | "rejected";
export type ClaimTarget = "market" | "vendor";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  username: string | null;
  favorite_market_slugs: string[];
  onboarded_at: string | null;
};

export type Market = {
  id: string;
  slug: string;
  name: string;
  about: string | null;
  address: string;
  city: string;
  province: string;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  geofence_radius_m: number;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url: string | null;
  tags: string[];
  /** Sections this market keeps itself. Directory upkeep leaves them alone. */
  maintenance_opt_outs?: string[];
  status: ListingStatus;
  featured: boolean;
  review_count: number;
  rating_avg: number | null;
  claimed_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MarketSchedule = {
  id: string;
  market_id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  season_start: string | null;
  season_end: string | null;
  notes: string | null;
};

export type Vendor = {
  id: string;
  slug: string;
  name: string;
  about: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url: string | null;
  tags: string[];
  /** Sections this stall keeps itself. Directory upkeep leaves them alone. */
  maintenance_opt_outs?: string[];
  /**
   * Tags inferred from the name so name-only stalls stay reachable through the filters.
   * Never rendered — a guess is not something the shop told us.
   */
  searchTags?: string[];
  status: ListingStatus;
  review_count: number;
  rating_avg: number | null;
  claimed_by?: string | null;
  created_by_market_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MarketVendor = {
  market_id: string;
  vendor_id: string;
  stall: string | null;
  days: number[];
};

/** Values allowed by vendor_menus_product_category_chk. */
export const PRODUCT_CATEGORIES = [
  "bread-and-bakery",
  "eggs",
  "honey",
  "cheese-and-dairy",
  "maple",
  "apples-and-fruit",
  "vegetables",
  "meat-and-turkey",
  "pies-and-sweets",
  "prepared-foods",
  "preserves-and-sauces",
  "coffee-and-tea",
  "plants-and-flowers",
  "alcohol",
  "seafood",
  "flour-and-grains",
  "nuts-and-snacks",
  "beverages",
  "body-care",
  "candles-and-crafts",
  "jewellery-and-accessories",
  "other",
  "pet-food",
  "clothing-and-accessories",
  "home-and-kitchen",
  "art-and-stationery",
  "toys-and-kids",
  "health-and-wellness",
  "services",
  "garden-and-outdoor",
  "spices-and-seasonings",
  "oils-and-vinegars",
  "baby",
  "gifts-and-sets",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Sentence-case labels. */
export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  "bread-and-bakery": "Bread and bakery",
  eggs: "Eggs",
  honey: "Honey",
  "cheese-and-dairy": "Cheese and dairy",
  maple: "Maple",
  "apples-and-fruit": "Apples and fruit",
  vegetables: "Vegetables",
  "meat-and-turkey": "Meat and turkey",
  "pies-and-sweets": "Pies and sweets",
  "prepared-foods": "Prepared foods",
  "preserves-and-sauces": "Preserves and sauces",
  "coffee-and-tea": "Coffee and tea",
  "plants-and-flowers": "Plants and flowers",
  alcohol: "Alcohol",
  seafood: "Seafood",
  "flour-and-grains": "Flour and grains",
  "nuts-and-snacks": "Nuts and snacks",
  beverages: "Beverages",
  "body-care": "Body care",
  "candles-and-crafts": "Candles and crafts",
  "jewellery-and-accessories": "Jewellery and accessories",
  other: "Other",
  "pet-food": "Pet food and supplies",
  "clothing-and-accessories": "Clothing and accessories",
  "home-and-kitchen": "Home and kitchen",
  "art-and-stationery": "Art and stationery",
  "toys-and-kids": "Toys and kids",
  "health-and-wellness": "Health and wellness",
  services: "Services",
  "garden-and-outdoor": "Garden and outdoor",
  "spices-and-seasonings": "Spices and seasonings",
  "oils-and-vinegars": "Oils and vinegars",
  baby: "Baby goods",
  "gifts-and-sets": "Gift sets and boxes",
};

export type MenuItem = {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  season: string | null;
  dietary: string[];
  menu_section: string | null;
  menu_section_order: number | null;
  product_category?: ProductCategory | null;
  product_slug?: string | null;
  for_sale?: boolean;
  offer_delivery?: boolean;
  offer_pickup?: boolean;
  offer_preorder?: boolean;
  offer_terms?: string | null;
  can_buy?: boolean;
};

export type Post = {
  id: string;
  user_id: string | null;
  market_id: string;
  body: string;
  photos: string[];
  flagged: boolean;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
  market_name?: string | null;
  market_slug?: string | null;
  market_city?: string | null;
  tags?: string[];
  vendor_name?: string | null;
  vendor_slug?: string | null;
};

export type Review = {
  id: string;
  user_id: string | null;
  market_id: string | null;
  vendor_id: string | null;
  rating: number;
  body: string;
  flagged: boolean;
  created_at: string;
  author_name?: string | null;
  market_name?: string | null;
  market_slug?: string | null;
  vendor_name?: string | null;
  vendor_slug?: string | null;
};

export type ClaimRequest = {
  id: string;
  user_id: string;
  target_type: ClaimTarget;
  target_id: string;
  evidence: string;
  status: ClaimStatus;
  admin_note: string | null;
  created_at: string;
  requester_name?: string | null;
  target_name?: string | null;
};

export type PortalApplication = {
  id: string;
  user_id: string;
  kind: ClaimTarget;
  organization_name: string | null;
  requested_target_id: string | null;
  assigned_target_id: string | null;
  status: ClaimStatus;
  created_at: string;
};

export type VendorHall = {
  slug: string;
  name: string;
};

export type MarketDetail = Market & {
  schedules: MarketSchedule[];
  vendors: (Vendor & { stall: string | null; days: number[]; halls: VendorHall[] })[];
  reviews: Review[];
  posts: Post[];
  feed: FloorItem[];
};

export type VendorDetail = Vendor & {
  menus: MenuItem[];
  markets: (Market & { stall: string | null; days: number[]; schedules: MarketSchedule[] })[];
  reviews: Review[];
  feed: FloorItem[];
};

export type FloorItem = {
  id: string;
  kind: "post" | "review";
  body: string;
  created_at: string;
  author_name: string | null;
  market_name: string | null;
  market_slug: string | null;
  vendor_name: string | null;
  vendor_slug: string | null;
  rating: number | null;
  price_level: number | null;
  tags: string[];
  photos: string[];
};

export type StallRef = {
  id: string;
  name: string;
  slug: string;
  market_id: string;
  stall: string | null;
  days: number[];
};

/** What the feed and composer need from a stall. Keeps `days` out of the client payload. */
export type StallPick = Pick<StallRef, "id" | "name" | "slug" | "market_id" | "stall">;

export type SearchFilters = {
  q?: string;
  province?: string;
  city?: string;
  weekday?: number;
  weekdays?: number[];
  tags?: string[];
  areas?: string[];
  setup?: string;
  openNow?: boolean;
  near?: { lat: number; lng: number };
  sort?: string;
};
