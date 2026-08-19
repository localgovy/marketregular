import { signOut, updateProfile } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SavedDesk } from "@/components/saved-rail";
import { getCurrentProfile, listMarkets, listVendors } from "@/lib/data/catalog";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/account");

  const supabase = await createServerSupabaseClient();
  const [{ data: posts }, markets, vendors] = await Promise.all([
    supabase
      ? supabase
          .from("posts")
          .select("id, body, created_at, markets(name, slug)")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as Array<{ id: string; body: string }> }),
    listMarkets(),
    listVendors(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1>Your stall pass</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        {profile.role === "admin"
          ? "You can edit the directory."
          : profile.role === "vendor"
            ? "You can update listings you claim."
            : "Reviews you write show on the tape and on the market or stall."}
      </p>
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
        Same list as on the floor. It lives in this browser for now.
      </p>
      <SavedDesk markets={markets} vendors={vendors} />
      <h2 className="mt-12">Your reviews</h2>
      <ul className="mt-3 grid gap-2">
        {(posts ?? []).map((post) => (
          <li key={post.id} className="rounded-lg bg-card p-3 text-sm ring-1 ring-foreground/10">
            <p>{post.body}</p>
          </li>
        ))}
        {!posts?.length ? (
          <li className="text-sm text-muted-foreground">Nothing written yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
