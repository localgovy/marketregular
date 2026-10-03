import { BackButton } from "@/components/back-button";
import { PasswordForm } from "@/components/password-form";
import { SignOutForm } from "@/components/sign-out-form";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/data/catalog";
import { mustSetPassword } from "@/lib/password-gate";
import { pageMeta } from "@/lib/seo";
import { createAuthedServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "New password",
  path: "/account/password",
  description: "Set a new password for your account.",
  index: false,
});

export default async function AccountPasswordPage() {
  const [profile, session] = await Promise.all([getCurrentProfile(), createAuthedServerClient()]);
  if (!profile) redirect("/login?next=/account/password");
  const forced = mustSetPassword(session.user?.app_metadata);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      {forced ? null : <BackButton href="/account" />}
      <h1>{forced ? "Choose your password" : "New password"}</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        {forced
          ? "Enter the password from the email, then choose the one you will use from now on. At least 8 characters. If that email did not arrive, sign out and use Forgot password on the sign-in page."
          : "Choose a password you have not used here before. At least 8 characters."}
      </p>
      <PasswordForm forced={forced} />
      {forced ? (
        <SignOutForm className="mt-6">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </SignOutForm>
      ) : null}
    </div>
  );
}
