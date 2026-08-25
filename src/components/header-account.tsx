"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export function HeaderAccount() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<{
    display_name: string | null;
    role: UserRole;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!documentHasAuthCookie()) {
      setProfile(null);
      setReady(true);
      return;
    }

    void (async () => {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        if (!cancelled) setReady(true);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        if (!cancelled) {
          setProfile(null);
          setReady(true);
        }
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
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!ready) return null;

  if (!profile) {
    return (
      <Link href="/login" className="shrink-0 text-sm font-medium hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <>
      {profile.role === "admin" ? (
        <Link href="/admin" className="shrink-0 text-sm font-medium hover:underline">
          Desk
        </Link>
      ) : null}
      <Link href="/account" className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
        {profile.display_name ?? "Account"}
      </Link>
    </>
  );
}
