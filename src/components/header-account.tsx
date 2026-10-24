"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { isSignInSlipAuthPath } from "@/lib/signin-slip";
import { useAuthCookie } from "@/lib/supabase/use-auth-cookie";
import { useMounted } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const SIGN_IN_CLASS = "shrink-0 text-sm font-medium hover:underline";
const CHIP_CLASS = cn(
  buttonVariants({ variant: "outline" }),
  "max-w-[7.5rem] min-w-0 shrink-0 truncate",
);

function loginHref(pathname: string, search: string) {
  if (isSignInSlipAuthPath(pathname)) return "/login";
  const next = `${pathname || "/"}${search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

export function HeaderAccount({
  tone = "paper",
  search = "",
}: {
  tone?: "paper" | "chalk";
  /** Current query string without "?". Passed from the header so client navigations stay in the return path. */
  search?: string;
}) {
  const pathname = usePathname() || "/";
  const hasCookie = useAuthCookie(false);
  const ready = useMounted();
  const query = search ? `?${search}` : "";
  const [profile, setProfile] = useState<{
    display_name: string | null;
    role: UserRole;
    ownsVendor: boolean;
    ownsMarket: boolean;
  } | null>(null);

  useEffect(() => {
    if (!hasCookie) return;
    let cancelled = false;

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
      const [{ data }, { data: isAdmin }, { data: ownsVendor }, { data: ownsMarket }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
        supabase.rpc("is_admin"),
        supabase.rpc("has_owned_vendor"),
        supabase.rpc("has_owned_market"),
      ]);
      if (cancelled) return;
      setProfile({
        display_name: data?.display_name ?? user.email?.split("@")[0] ?? "You",
        role: isAdmin === true ? "admin" : "user",
        ownsVendor: ownsVendor === true,
        ownsMarket: ownsMarket === true,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, hasCookie]);

  const shown = hasCookie ? profile : null;
  const chalk = tone === "chalk";
  const textLink = chalk
    ? "inline-flex h-10 shrink-0 items-center px-1 text-sm font-medium whitespace-nowrap text-chalk underline decoration-dashed underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
    : SIGN_IN_CLASS;
  const nameLink = chalk ? cn(textLink, "max-w-[9rem] min-w-0 truncate") : CHIP_CLASS;

  if (shown) {
    return (
      <>
        {shown.ownsMarket ? (
          <Link href="/market" className={textLink}>
            Your market
          </Link>
        ) : null}
        {shown.ownsVendor ? (
          <Link href="/vendor" className={textLink}>
            Your stall
          </Link>
        ) : null}
        {shown.role === "admin" ? (
          <Link href="/admin" className={textLink}>
            Admin
          </Link>
        ) : null}
        <Link
          href="/account"
          title={shown.display_name ?? "Account"}
          className={nameLink}
        >
          {shown.display_name ?? "Account"}
        </Link>
      </>
    );
  }

  if (ready && hasCookie) {
    return (
      <Link href="/account" title="Account" className={nameLink}>
        Account
      </Link>
    );
  }

  return (
    <Link href={loginHref(pathname, query)} rel="nofollow" className={textLink}>
      Sign in
    </Link>
  );
}
