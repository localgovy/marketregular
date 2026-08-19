import { signOut, updateProfile } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeptDesk } from "@/components/kept-rail";
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
      <h1 className="font-heading text-4xl">Your stall pass</h1>
      <p className="mt-2 text-muted-foreground">
        {profile.role === "admin"
          ? "You can edit the directory."
          : profile.role === "vendor"
            ? "You can update listings you claim."
            : "Posts and reviews only count when you're on site."}
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
      <h2 className="mt-12 font-heading text-2xl">Kept</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Same list as on the floor. It lives in this browser for now.
      </p>
      <KeptDesk markets={markets} vendors={vendors} />
      <h2 className="mt-12 font-heading text-2xl">Your posts</h2>
      <ul className="mt-3 grid gap-2">
        {(posts ?? []).map((post) => (
          <li key={post.id} className="rounded-lg bg-card p-3 text-sm ring-1 ring-foreground/10">
            <p>{post.body}</p>
          </li>
        ))}
        {!posts?.length ? (
          <li className="text-sm text-muted-foreground">Nothing from the floor yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
