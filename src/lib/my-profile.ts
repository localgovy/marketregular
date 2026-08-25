import type { Profile } from "@/types/database";

export type MyProfile = Profile & {
  visit_plan_emailed_at: string | null;
};

function parseMyProfile(data: unknown): MyProfile | null {
  const row = (Array.isArray(data) ? data[0] : data) as Partial<MyProfile> | undefined;
  if (!row || typeof row.id !== "string") return null;
  return {
    id: row.id,
    display_name: row.display_name ?? null,
    avatar_url: row.avatar_url ?? null,
    role: row.role === "admin" || row.role === "vendor" ? row.role : "user",
    username: row.username ?? null,
    favorite_market_slugs: Array.isArray(row.favorite_market_slugs)
      ? row.favorite_market_slugs.filter((item): item is string => typeof item === "string")
      : [],
    onboarded_at: row.onboarded_at ?? null,
    visit_plan_emailed_at: row.visit_plan_emailed_at ?? null,
  };
}

function asProfile(row: MyProfile): Profile {
  return {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    role: row.role,
    username: row.username,
    favorite_market_slugs: row.favorite_market_slugs ?? [],
    onboarded_at: row.onboarded_at,
  };
}

type RpcClient = {
  rpc: (
    fn: string,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export async function loadMyProfile(supabase: RpcClient): Promise<{
  profile: MyProfile | null;
  error: boolean;
}> {
  const { data, error } = await supabase.rpc("my_profile");
  if (error) return { profile: null, error: true };
  return { profile: parseMyProfile(data), error: false };
}

export async function fetchMyProfile(supabase: RpcClient): Promise<MyProfile | null> {
  const { profile } = await loadMyProfile(supabase);
  return profile;
}

export async function fetchMyPublicProfile(supabase: RpcClient): Promise<Profile | null> {
  const row = await fetchMyProfile(supabase);
  return row ? asProfile(row) : null;
}

