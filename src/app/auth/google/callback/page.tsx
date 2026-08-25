import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "Sign in",
  path: "/auth/google/callback",
  description: "Google sign-in has moved.",
  index: false,
});

export default function GoogleCallbackPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1>Sign in</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        Google sign-in did not finish.{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
