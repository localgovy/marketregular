import { createAuthedServerClient } from "@/lib/supabase/server";
import { fetchMyProfile } from "@/lib/my-profile";
import { EMPTY_SAVES, savesFromRows, type Saves } from "@/lib/saves";
import type { PortalApplication } from "@/types/database";

export async function readMySaves(): Promise<{ saves: Saves; failed: boolean }> {
  const { supabase, user } = await createAuthedServerClient();
  if (!supabase || !user) return { saves: EMPTY_SAVES, failed: false };
  const { data, error } = await supabase
    .from("saves")
    .select("kind, slug, detail")
    .eq("user_id", user.id);
  if (error) return { saves: EMPTY_SAVES, failed: true };
  return { saves: savesFromRows(data), failed: false };
}

export async function loadMySaves(): Promise<Saves> {
  const { saves } = await readMySaves();
  return saves;
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
      applications: [] as PortalApplication[],
      reviewCount: 0,
    };
  }

  const [savesRes, postsRes, applicationsRes, postCountRes, me] = await Promise.all([
    supabase.from("saves").select("kind, slug, detail").eq("user_id", user.id),
    supabase
      .from("posts")
      .select("id, body, created_at, market_id, markets(name, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("portal_applications")
      .select("id, user_id, kind, organization_name, requested_target_id, assigned_target_id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    fetchMyProfile(supabase),
  ]);

  if (savesRes.error || postsRes.error || applicationsRes.error || postCountRes.error) {
    return {
      email: user.email ?? null,
      visitPlanEmailedAt: me?.visit_plan_emailed_at ?? null,
      saves: savesRes.error ? EMPTY_SAVES : savesFromRows(savesRes.data),
      posts: (postsRes.data ?? []).map((row) => ({
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        market_id: row.market_id,
        markets: null,
      })),
      applications: (applicationsRes.data ?? []) as PortalApplication[],
      reviewCount: postCountRes.count ?? 0,
    };
  }

  return {
    email: user.email ?? null,
    visitPlanEmailedAt: me?.visit_plan_emailed_at ?? null,
    saves: savesFromRows(savesRes.data),
    posts: (postsRes.data ?? []).map((row) => {
      const raw = row.markets;
      const market = Array.isArray(raw) ? raw[0] : raw;
      return {
        id: row.id,
        body: row.body,
        created_at: row.created_at,
        market_id: row.market_id,
        markets:
          market && typeof market.name === "string" && typeof market.slug === "string"
            ? { name: market.name, slug: market.slug }
            : null,
      };
    }),
    applications: (applicationsRes.data ?? []) as PortalApplication[],
    reviewCount: postCountRes.count ?? 0,
  };
}
