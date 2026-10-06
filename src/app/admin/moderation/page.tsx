import { FlagButton } from "@/components/admin/flag-button";
import { ReviewScore } from "@/components/listing-score";
import { fetchAllRows, requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";
import { decodeFloorBody } from "@/lib/floor-note";
import { formatPostedAt } from "@/lib/format";

type NameRel = { name?: string | null; slug?: string | null } | { name?: string | null; slug?: string | null }[] | null;
type ProfileRel = { display_name?: string | null } | { display_name?: string | null }[] | null;

type NoteRow = {
  id: string;
  body: string;
  flagged: boolean;
  created_at: string;
  profiles?: ProfileRel;
  markets?: NameRel;
};

type ReviewRow = NoteRow & {
  rating: number;
  vendors?: NameRel;
};

function one<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function relName(value: NameRel | undefined) {
  const name = one(value)?.name?.trim();
  return name || null;
}

function personName(value: ProfileRel | undefined) {
  return one(value)?.display_name?.trim() || "Regular";
}

function mergeNotes<T extends { id: string; created_at: string }>(latest: T[], flagged: T[]) {
  const byId = new Map<string, T>();
  for (const row of [...latest, ...flagged]) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

const POST_SELECT = "id, body, flagged, created_at, profiles(display_name), markets(name, slug)";
const REVIEW_SELECT =
  "id, body, rating, flagged, created_at, profiles(display_name), markets(name, slug), vendors(name, slug)";

export default async function ModerationPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;

  const [posts, reviews] = await Promise.all([
    loadNotes<NoteRow>(supabase, "posts", POST_SELECT),
    loadNotes<ReviewRow>(supabase, "reviews", REVIEW_SELECT),
  ]);

  const vendorNames = await vendorNamesFor(supabase, posts.rows);

  return (
    <div className="grid gap-10">
      <section>
        <h2>Posts</h2>
        {posts.failed ? (
          <p className="mt-3 text-base text-muted-foreground">Could not load posts.</p>
        ) : posts.rows.length ? (
          <ul className="mt-3 grid gap-3">
            {posts.rows.map((post) => {
              const decoded = decodeFloorBody(post.body);
              const stall = decoded.vendorSlug
                ? (vendorNames.get(decoded.vendorSlug) ?? decoded.vendorSlug)
                : null;
              const where = [personName(post.profiles), relName(post.markets), stall].filter(Boolean);
              return (
                <li key={post.id} className="rounded-xl bg-card p-4 text-base ring-1 ring-foreground/10">
                  <p>{decoded.body}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {post.flagged ? "Flagged" : "Live"}
                    {where.length ? ` · ${where.join(" · ")}` : ""}
                    {" · "}
                    {formatPostedAt(post.created_at)}
                  </p>
                  <FlagButton table="posts" id={post.id} flagged={post.flagged} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-base text-muted-foreground">No posts yet.</p>
        )}
      </section>
      <section>
        <h2>Older scores</h2>
        {reviews.failed ? (
          <p className="mt-3 text-base text-muted-foreground">Could not load older scores.</p>
        ) : reviews.rows.length ? (
          <ul className="mt-3 grid gap-3">
            {reviews.rows.map((review) => {
              const decoded = decodeFloorBody(review.body);
              const where = [personName(review.profiles), relName(review.markets), relName(review.vendors)].filter(
                Boolean,
              );
              return (
                <li key={review.id} className="rounded-xl bg-card p-4 text-base ring-1 ring-foreground/10">
                  <p className="flex flex-wrap items-center gap-2">
                    <ReviewScore value={review.rating} />
                    <span>{decoded.body}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.flagged ? "Flagged" : "Live"}
                    {where.length ? ` · ${where.join(" · ")}` : ""}
                    {" · "}
                    {formatPostedAt(review.created_at)}
                  </p>
                  <FlagButton table="reviews" id={review.id} flagged={review.flagged} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-base text-muted-foreground">No older scores.</p>
        )}
      </section>
    </div>
  );
}

async function loadNotes<T extends { id: string; created_at: string }>(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAdmin>>["supabase"]>,
  table: "posts" | "reviews",
  columns: string,
) {
  try {
    const latest = await supabase.from(table).select(columns).order("created_at", { ascending: false }).limit(50);
    if (latest.error) return { rows: [] as T[], failed: true };
    const flagged = await fetchAllRows<T>((from, to) =>
      supabase
        .from(table)
        .select(columns)
        .eq("flagged", true)
        .order("created_at", { ascending: false })
        .range(from, to)
        .then((result) => ({
          data: (result.data ?? null) as T[] | null,
          error: result.error,
        })),
    );
    return { rows: mergeNotes((latest.data ?? []) as unknown as T[], flagged), failed: false };
  } catch {
    return { rows: [] as T[], failed: true };
  }
}

async function vendorNamesFor(
  supabase: NonNullable<Awaited<ReturnType<typeof requireAdmin>>["supabase"]>,
  posts: NoteRow[],
) {
  const slugs = [
    ...new Set(
      posts.flatMap((post) => {
        const slug = decodeFloorBody(post.body).vendorSlug;
        return slug ? [slug] : [];
      }),
    ),
  ];
  const names = new Map<string, string>();
  if (!slugs.length) return names;
  const { data } = await supabase.from("vendors").select("slug, name").in("slug", slugs);
  for (const row of data ?? []) {
    if (row.slug && row.name) names.set(row.slug, row.name);
  }
  return names;
}
