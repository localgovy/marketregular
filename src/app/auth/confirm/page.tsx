import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { verifyEmailOtp } from "@/app/actions/auth";
import { emailOtpType } from "@/lib/auth-callback";
import { AUTH_NEXT_COOKIE, safePath } from "@/lib/auth-redirect";
import { pageMeta } from "@/lib/seo";
import { cookies } from "next/headers";
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
  const [params, jar] = await Promise.all([searchParams, cookies()]);
  const tokenHash = params.token_hash?.trim() ?? "";
  const type = emailOtpType(params.type ?? null);
  const cookieNext = jar.get(AUTH_NEXT_COOKIE)?.value;
  let fromCookie: string | undefined;
  if (cookieNext) {
    try {
      fromCookie = decodeURIComponent(cookieNext);
    } catch {
      fromCookie = cookieNext;
    }
  }
  const next = safePath(params.next || fromCookie);

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
