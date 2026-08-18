import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";

export default async function AdminHomePage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const [markets, vendors, posts, claims] = await Promise.all([
    supabase.from("markets").select("id", { count: "exact", head: true }),
    supabase.from("vendors").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("flagged", false),
    supabase.from("claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const stats = [
    { label: "Markets", value: markets.count ?? 0 },
    { label: "Vendors", value: vendors.count ?? 0 },
    { label: "Live posts", value: posts.count ?? 0 },
    { label: "Open claims", value: claims.count ?? 0 },
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <li key={s.label} className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">{s.label}</p>
          <p className="font-heading text-4xl">{s.value}</p>
        </li>
      ))}
    </ul>
  );
}
