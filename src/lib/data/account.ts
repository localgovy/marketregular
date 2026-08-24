import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EMPTY_SAVES, type Saves } from "@/lib/saves";
import type { ClaimRequest } from "@/types/database";

function toSaves(rows: Array<{ kind: string; slug: string }> | null): Saves {
  const markets: string[] = [];
  const vendors: string[] = [];
  for (const row of rows ?? []) {
    if (row.kind === "market") markets.push(row.slug);
    else if (row.kind === "vendor") vendors.push(row.slug);
  }
  return { markets, vendors };
}

export type AccountPost = {
  id: string;
  body: string;
  created_at: string;
  verified_on_site: boolean;
  markets: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export async function loadAccountDesk(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      email: null,
      saves: EMPTY_SAVES,
      posts: [] as AccountPost[],
      claims: [] as ClaimRequest[],
      reviewCount: 0,
    };
  }

  const [{ data: userData }, savesRes, postsRes, claimsRes, postCountRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("saves").select("kind, slug").eq("user_id", userId),
    supabase
      .from("posts")
      .select("id, body, created_at, verified_on_site, markets(name, slug)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("claim_requests")
      .select("id, user_id, target_type, target_id, evidence, status, admin_note, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return {
    email: userData.user?.email ?? null,
    saves: toSaves(savesRes.data),
    posts: (postsRes.data ?? []) as AccountPost[],
    claims: (claimsRes.data ?? []) as ClaimRequest[],
    reviewCount: postCountRes.count ?? 0,
  };
}
