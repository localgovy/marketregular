"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { isSignInSlipAuthPath } from "@/lib/signin-slip";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import { useAuthCookie } from "@/lib/supabase/use-auth-cookie";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const SIGN_IN_CLASS = "shrink-0 text-sm font-medium hover:underline";
const CHIP_CLASS = cn(
  buttonVariants({ variant: "outline" }),
  "max-w-[7.5rem] min-w-0 shrink-0 truncate",
);

function loginHref(pathname: string, query: string) {
  if (isSignInSlipAuthPath(pathname)) return "/login";
  const next = `${pathname}${query ? `?${query}` : ""}`;
  return `/login?next=${encodeURIComponent(next || "/")}`;
}

export function HeaderAccountFallback() {
  return (
    <Link href="/login" rel="nofollow" className={SIGN_IN_CLASS}>
      Sign in
    </Link>
  );
}

export function HeaderAccount() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasCookie = useAuthCookie(false);
  const query = searchParams.toString();
  const [profile, setProfile] = useState<{
    display_name: string | null;
    role: UserRole;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!documentHasAuthCookie()) {
      setProfile(null);
      return;
    }

    void (async () => {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        if (!cancelled) setProfile(null);
        return;
      }
      const [{ data }, { data: isAdmin }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.rpc("is_admin"),
      ]);
      if (cancelled) return;
      setProfile({
        display_name: data?.display_name ?? user.email?.split("@")[0] ?? "You",
        role: isAdmin === true ? "admin" : "user",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (profile) {
    return (
      <>
        {profile.role === "admin" ? (
          <Link href="/admin" className={SIGN_IN_CLASS}>
            Desk
          </Link>
        ) : null}
        <Link
          href="/account"
          title={profile.display_name ?? "Account"}
          className={CHIP_CLASS}
        >
          {profile.display_name ?? "Account"}
        </Link>
      </>
    );
  }

  if (hasCookie) {
    return (
      <Link href="/account" title="Account" className={CHIP_CLASS}>
        Account
      </Link>
    );
  }

  return (
    <Link href={loginHref(pathname, query)} rel="nofollow" className={SIGN_IN_CLASS}>
      Sign in
    </Link>
  );
}
