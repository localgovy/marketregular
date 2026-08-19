import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-md px-4 py-14">
      <h1 className="font-heading text-4xl">Come in</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Sign in to post or review. Location is optional. Browsing stays open.
      </p>
      <LoginForm next={next || "/account"} />
    </div>
  );
}
