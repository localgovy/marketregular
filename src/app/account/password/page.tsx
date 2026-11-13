import { BackButton } from "@/components/back-button";
import { PasswordForm } from "@/components/password-form";
import { SignOutForm } from "@/components/sign-out-form";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/data/catalog";
import { mustSetPassword } from "@/lib/password-gate";
import { siteCopy } from "@/content/site-copy";
import { pageMeta } from "@/lib/seo";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: siteCopy["/account/password"].title,
  path: "/account/password",
  description: siteCopy["/account/password"].description,
  index: false,
});

export default async function AccountPasswordPage() {
  const [profile, session] = await Promise.all([getCurrentProfile(), createAuthedServerClient()]);
  if (!profile) redirect("/login?next=/account/password");
  const forced = mustSetPassword(session.user?.app_metadata);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      {forced ? null : <BackButton href="/account" />}
      <h1>{forced ? siteCopy["/account/password"].choose : siteCopy["/account/password"].h1}</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        {forced ? siteCopy["/account/password"].ledeForced : siteCopy["/account/password"].lede}
      </p>
      <PasswordForm forced={forced} />
      {forced ? (
        <SignOutForm className="mt-6">
          <Button type="submit" variant="outline">
            {siteCopy["/account/password"].signOut}
          </Button>
        </SignOutForm>
      ) : null}
    </div>
  );
}
