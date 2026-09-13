import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { verifyEmailOtp } from "@/app/actions/auth";
import { emailOtpType } from "@/lib/auth-callback";
import { safePath } from "@/lib/auth-redirect";
import { pageMeta } from "@/lib/seo";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: "Finish signing in",
  path: "/auth/confirm",
  description: "Confirm this email link to finish signing in.",
  index: false,
});

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const params = await searchParams;
  const tokenHash = params.token_hash?.trim() ?? "";
  const type = emailOtpType(params.type ?? null);
  const next = safePath(params.next);

  if (!tokenHash || !type) {
    redirect("/login?error=session");
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <BackButton href="/login" />
      <h1>Finish signing in</h1>
      <p className="type-lede mt-2 mb-8 text-muted-foreground">
        This link only works once. Continue here so a mail preview does not use it up.
      </p>
      <form action={verifyEmailOtp}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
