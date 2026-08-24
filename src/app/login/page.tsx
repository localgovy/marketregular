import { BackButton } from "@/components/back-button";
import { LoginForm } from "@/components/login-form";
import { safePath } from "@/lib/auth-redirect";
import { getCurrentProfile } from "@/lib/data/catalog";
import { pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "Sign in",
  path: "/login",
  description: "Sign in to save markets across browsers and post reviews.",
  index: false,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next: raw }, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const next = safePath(raw);
  if (profile) redirect(next);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <BackButton href="/" />
      <h1>Come in</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        Post and review when you&apos;re at the market. Browsing stays open.
      </p>
      <LoginForm next={next} />
    </div>
  );
}
