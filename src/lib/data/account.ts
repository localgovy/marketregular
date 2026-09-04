import { createAuthedServerClient } from "@/lib/supabase/server";
import { fetchMyProfile } from "@/lib/my-profile";
import { EMPTY_SAVES, savesFromRows, type Saves } from "@/lib/saves";
import type { ClaimRequest } from "@/types/database";

export async function loadMySaves(): Promise<Saves> {
  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user) return EMPTY_SAVES;
  const { data, error } = await supabase
    .from("saves")
    .select("kind, slug, detail")
    .eq("user_id", user.id);
  if (error) return EMPTY_SAVES;
  return savesFromRows(data);
}

export type AccountPost = {
  id: string;
  body: string;
  created_at: string;
  market_id: string;
  markets: { name: string; slug: string } | null;
};

export async function loadAccountDesk(userId: string) {
  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user || user.id !== userId) {
    return {
      email: null,
      visitPlanEmailedAt: null,
      saves: EMPTY_SAVES,
      posts: [] as AccountPost[],
      claims: [] as ClaimRequest[],
      reviewCount: 0,
    };
  }

  const [savesRes, postsRes, claimsRes, postCountRes, me] = await Promise.all([
    supabase.from("saves").select("kind, slug, detail").eq("user_id", user.id),
    supabase
      .from("posts")
      .select("id, body, created_at, market_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("claim_requests")
      .select("id, user_id, target_type, target_id, evidence, status, admin_note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    fetchMyProfile(supabase),
  ]);

  if (savesRes.error || postsRes.error || claimsRes.error || postCountRes.error) {
    return {
      email: user.email ?? null,
      visitPlanEmailedAt: me?.visit_plan_emailed_at ?? null,
      saves: savesRes.error ? EMPTY_SAVES : savesFromRows(savesRes.data),
      posts: (postsRes.data ?? []).map((row) => ({
        ...row,
        markets: null,
      })) as AccountPost[],
      claims: (claimsRes.data ?? []) as ClaimRequest[],
      reviewCount: postCountRes.count ?? 0,
    };
  }

  return {
    email: user.email ?? null,
    visitPlanEmailedAt: me?.visit_plan_emailed_at ?? null,
    saves: savesFromRows(savesRes.data),
    posts: (postsRes.data ?? []).map((row) => ({
      ...row,
      markets: null,
    })) as AccountPost[],
    claims: (claimsRes.data ?? []) as ClaimRequest[],
    reviewCount: postCountRes.count ?? 0,
  };
}
