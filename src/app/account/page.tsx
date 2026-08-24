import { deleteOwnPost } from "@/app/actions/presence";
import { signOut, updateProfile } from "@/app/actions/auth";
import { DeleteAccountForm } from "@/components/delete-account-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SavedDesk } from "@/components/saved-rail";
import { getCurrentProfile, listMarkets, listVendors } from "@/lib/data/catalog";
import { decodeFloorBody } from "@/lib/floor-note";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/constants";
import { pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "Account",
  path: "/account",
  description: `Your ${SITE_NAME} account.`,
  index: false,
});

function marketLink(
  markets: unknown,
): { name: string; slug: string } | null {
  if (!markets) return null;
  const row = Array.isArray(markets) ? markets[0] : markets;
  if (
    row &&
    typeof row === "object" &&
    "slug" in row &&
    "name" in row &&
    typeof row.slug === "string" &&
    typeof row.name === "string"
  ) {
    return { name: row.name, slug: row.slug };
  }
  return null;
}

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");

  const supabase = await createServerSupabaseClient();
  const [{ data: posts }, markets, vendors] = await Promise.all([
    supabase
      ? supabase
          .from("posts")
          .select("id, body, created_at, markets(name, slug)")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    listMarkets(),
    listVendors(),
  ]);

  const roleLine =
    profile.role === "admin"
      ? "You can edit the directory."
      : "Reviews you write show in the live list, and on the market or stall.";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1>Account</h1>
      <p className="type-lede mt-2 text-muted-foreground">{roleLine}</p>
      <form action={updateProfile} className="mt-8 grid gap-3">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
        />
        <Button type="submit" className="w-fit">
          Save
        </Button>
      </form>
      <form action={signOut} className="mt-4">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
      <h2 className="mt-12">Saved</h2>
      <p className="type-kicker mt-1 mb-4 text-muted-foreground">
        Same list as on the floor. It follows this account.
      </p>
      <SavedDesk markets={markets} vendors={vendors} followAccount />
      <h2 className="mt-12">Your reviews</h2>
      <ul className="mt-3 grid gap-2">
        {(posts ?? []).map((post) => {
          const market = marketLink(post.markets);
          const text = decodeFloorBody(post.body).body;
          const when = new Date(post.created_at).toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          return (
            <li
              key={post.id}
              className="grid gap-2 rounded-lg bg-card p-3 text-sm ring-1 ring-foreground/10"
            >
              <p>{text}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                <p>
                  {market ? (
                    <Link href={`/markets/${market.slug}`} className="font-medium hover:underline">
                      {market.name}
                    </Link>
                  ) : null}
                  {market ? " · " : null}
                  <span className="font-mono tabular-nums">{when}</span>
                </p>
                <form action={deleteOwnPost}>
                  <input type="hidden" name="id" value={post.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
        {!posts?.length ? (
          <li className="text-sm text-muted-foreground">Nothing written yet.</li>
        ) : null}
      </ul>
      <section className="mt-16 border-t border-border pt-8">
        <h2>Delete account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This removes your sign-in, saved list, reviews, and claim requests. It cannot be undone.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
