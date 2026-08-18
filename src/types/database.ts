export type UserRole = "user" | "vendor" | "admin";
export type ListingStatus = "draft" | "published";
export type ClaimStatus = "pending" | "approved" | "rejected";
export type ClaimTarget = "market" | "vendor";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
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
  lat: number;
  lng: number;
  geofence_radius_m: number;
  website: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  status: ListingStatus;
  featured: boolean;
  claimed_by: string | null;
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
  phone: string | null;
  tags: string[];
  status: ListingStatus;
  claimed_by: string | null;
  created_at?: string;
};

export type MarketVendor = {
  market_id: string;
  vendor_id: string;
  stall: string | null;
  days: number[];
};

export type MenuItem = {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  season: string | null;
  dietary: string[];
};

export type Post = {
  id: string;
  user_id: string | null;
  market_id: string;
  body: string;
  photos: string[];
  verified_on_site: boolean;
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
  verified_on_site: boolean;
  flagged: boolean;
  created_at: string;
  author_name?: string | null;
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

export type MarketDetail = Market & {
  schedules: MarketSchedule[];
  vendors: (Vendor & { stall: string | null; days: number[] })[];
  reviews: Review[];
  posts: Post[];
};

export type VendorDetail = Vendor & {
  menus: MenuItem[];
  markets: (Market & { stall: string | null; days: number[] })[];
  reviews: Review[];
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
  verified_on_site: boolean;
  tags: string[];
};

export type StallRef = {
  id: string;
  name: string;
  slug: string;
  market_id: string;
  stall: string | null;
  days: number[];
};

export type SearchFilters = {
  q?: string;
  province?: string;
  city?: string;
  weekday?: number;
  tag?: string;
  openNow?: boolean;
  near?: { lat: number; lng: number };
};
