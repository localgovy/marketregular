import { flagItem, unflagItem } from "@/app/actions/presence";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { isSupabaseConfigured } from "@/lib/constants";

export default async function ModerationPage() {
  if (!isSupabaseConfigured()) return null;
  const { supabase } = await requireAdmin();
  if (!supabase) return null;
  const [{ data: posts }, { data: reviews }] = await Promise.all([
    supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <div className="grid gap-10">
      <section>
        <h2 className="font-heading text-2xl">Posts</h2>
        <ul className="mt-3 grid gap-3">
          {(posts ?? []).map((post) => (
            <li key={post.id} className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
              <p>{post.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {post.flagged ? "Flagged" : "Live"} · {post.created_at}
              </p>
              <form
                className="mt-2"
                action={async () => {
                  "use server";
                  if (post.flagged) await unflagItem("posts", post.id);
                  else await flagItem("posts", post.id);
                }}
              >
                <Button type="submit" size="sm" variant="outline">
                  {post.flagged ? "Restore" : "Flag"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-heading text-2xl">Reviews</h2>
        <ul className="mt-3 grid gap-3">
          {(reviews ?? []).map((review) => (
            <li key={review.id} className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
              <p>
                {review.rating}/5 — {review.body}
              </p>
              <form
                className="mt-2"
                action={async () => {
                  "use server";
                  if (review.flagged) await unflagItem("reviews", review.id);
                  else await flagItem("reviews", review.id);
                }}
              >
                <Button type="submit" size="sm" variant="outline">
                  {review.flagged ? "Restore" : "Flag"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
