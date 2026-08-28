import { AuthCallbackClient } from "@/app/auth/callback/callback-client";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...pageMeta({
    title: "Signing in",
    path: "/auth/callback",
    description: "Finishing sign-in.",
    index: false,
  }),
  referrer: "no-referrer",
};

export default function AuthCallbackPage() {
  return <AuthCallbackClient />;
}
