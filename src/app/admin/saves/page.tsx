import { requireAdmin } from "@/lib/admin";
import { listBlogPosts } from "@/lib/blog";
import { isSupabaseConfigured } from "@/lib/constants";
import { displayListingHeading, parseListingDetail } from "@/lib/listing-saves";

type SaveRow = {
  user_id: string;
  kind: string;
  slug: string;
  created_at: string;
  detail: unknown;
  profiles: { display_name: string | null; username: string | null } | { display_name: string | null; username: string | null }[] | null;
};

type ListedSave = {
  key: string;
  kind: string;
  name: string;
};

type UserSaves = {
  userId: string;
  name: string;
  username: string | null;
  email: string | null;
  saves: ListedSave[];
};

function profileOf(row: SaveRow) {
  const profile = row.profiles;
  if (!profile) return null;
  return Array.isArray(profile) ? (profile[0] ?? null) : profile;
}

function saveLabel(
  row: SaveRow,
  markets: Map<string, string>,
  vendors: Map<string, string>,
  blogs: Map<string, string>,
): ListedSave {
  const key = `${row.kind}:${row.slug}`;
  if (row.kind === "market") {
    return { key, kind: "Market", name: markets.get(row.slug) ?? row.slug };
  }
  if (row.kind === "vendor") {
    return { key, kind: "Vendor", name: vendors.get(row.slug) ?? row.slug };
  }
  if (row.kind === "blog") {
    return { key, kind: "Note", name: blogs.get(row.slug) ?? row.slug };
  }
  const listing = parseListingDetail(row.slug, row.detail);
  if (!listing) return { key, kind: "Listing", name: row.slug };
  return {
    key,
    kind: "Listing",
    name: `${displayListingHeading(listing.heading)} · ${listing.marketName}`,
  };
}

export default async function AdminSavesPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;

  const rows: SaveRow[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("saves")
      .select("user_id, kind, slug, created_at, detail, profiles(display_name, username)")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("admin saves", error);
      break;
    }
    rows.push(...((data ?? []) as SaveRow[]));
    if (!data || data.length < pageSize) break;
  }

  const marketSlugs = [...new Set(rows.filter((row) => row.kind === "market").map((row) => row.slug))];
  const vendorSlugs = [...new Set(rows.filter((row) => row.kind === "vendor").map((row) => row.slug))];
  const [marketsRes, vendorsRes, emails] = await Promise.all([
    marketSlugs.length
      ? supabase.from("markets").select("slug, name").in("slug", marketSlugs)
      : Promise.resolve({ data: [] as { slug: string; name: string }[] }),
    vendorSlugs.length
      ? supabase.from("vendors").select("slug, name").in("slug", vendorSlugs)
      : Promise.resolve({ data: [] as { slug: string; name: string }[] }),
    emailsByUserId(supabase),
  ]);

  const markets = new Map((marketsRes.data ?? []).map((row) => [row.slug, row.name]));
  const vendors = new Map((vendorsRes.data ?? []).map((row) => [row.slug, row.name]));
  const blogs = new Map(listBlogPosts().map((post) => [post.slug, post.title]));

  const groups: UserSaves[] = [];
  const byUser = new Map<string, UserSaves>();
  for (const row of rows) {
    let group = byUser.get(row.user_id);
    if (!group) {
      const profile = profileOf(row);
      group = {
        userId: row.user_id,
        name: profile?.display_name?.trim() || "Regular",
        username: profile?.username ?? null,
        email: emails.get(row.user_id) ?? null,
        saves: [],
      };
      byUser.set(row.user_id, group);
      groups.push(group);
    }
    group.saves.push(saveLabel(row, markets, vendors, blogs));
  }

  if (!groups.length) {
    return <p className="text-base text-muted-foreground">No saves yet.</p>;
  }

  return (
    <ul className="grid gap-4">
      {groups.map((group) => {
        const identity = [
          group.username ? `@${group.username}` : null,
          group.email,
        ].filter(Boolean);
        return (
          <li key={group.userId} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <h2>{group.name}</h2>
            {identity.length ? (
              <p className="mt-1 text-base text-muted-foreground">{identity.join(" · ")}</p>
            ) : null}
            <ul className="mt-3 grid gap-2">
              {group.saves.map((save) => (
                <li key={save.key} className="text-base">
                  <span className="font-medium">{save.kind}</span>
                  {" · "}
                  {save.name}
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

async function emailsByUserId(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAdmin>>["supabase"]>,
) {
  const emails = new Map<string, string>();
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) break;
    for (const user of data.users) {
      if (user.email) emails.set(user.id, user.email);
    }
    if (data.users.length < perPage) break;
  }
  return emails;
}
