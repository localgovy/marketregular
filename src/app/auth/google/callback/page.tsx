import { GoogleCallbackClient } from "@/app/auth/google/callback/google-callback-client";
import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "Signing in",
  path: "/auth/google/callback",
  description: "Finishing Google sign-in.",
  index: false,
});

export default function GoogleCallbackPage() {
  return <GoogleCallbackClient />;
}
