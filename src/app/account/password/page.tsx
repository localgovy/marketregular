import { BackButton } from "@/components/back-button";
import { PasswordForm } from "@/components/password-form";
import { getCurrentProfile } from "@/lib/data/catalog";
import { pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "New password",
  path: "/account/password",
  description: "Set a new password for your account.",
  index: false,
});

export default async function AccountPasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/account/password");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <BackButton href="/account" />
      <h1>New password</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        Choose a password you haven&apos;t used here before. At least 8 characters.
      </p>
      <PasswordForm />
    </div>
  );
}
