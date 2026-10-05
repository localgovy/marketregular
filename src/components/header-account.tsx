"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

function loginHref(pathname: string, search = "") {
  if (isSignInSlipAuthPath(pathname)) return "/login";
  const next = `${pathname || "/"}${search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

export function HeaderAccount() {
  const pathname = usePathname();
  const hasCookie = useAuthCookie(false);
  const ready = useMounted();
  const search = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("popstate", onStoreChange);
      return () => window.removeEventListener("popstate", onStoreChange);
    },
    () => window.location.search,
    () => "",
  );
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

  if (shown) {
    return (
      <>
        {shown.ownsMarket ? (
          <Link href="/market" className={SIGN_IN_CLASS}>
            Your market
          </Link>
        ) : null}
        {shown.ownsVendor ? (
          <Link href="/vendor" className={SIGN_IN_CLASS}>
            Your stall
          </Link>
        ) : null}
        {shown.role === "admin" ? (
          <Link href="/admin" className={SIGN_IN_CLASS}>
            Admin
          </Link>
        ) : null}
        <Link
          href="/account"
          title={shown.display_name ?? "Account"}
          className={CHIP_CLASS}
        >
          {shown.display_name ?? "Account"}
        </Link>
      </>
    );
  }

  if (ready && hasCookie) {
    return (
      <Link href="/account" title="Account" className={CHIP_CLASS}>
        Account
      </Link>
    );
  }

  return (
    <Link href={loginHref(pathname, search)} rel="nofollow" className={SIGN_IN_CLASS}>
      Sign in
    </Link>
  );
}
