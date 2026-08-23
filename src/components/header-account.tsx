"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cookieLooksLikeSupabaseAuth } from "@/lib/supabase/auth-cookie";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

function documentHasAuthCookie() {
  return document.cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0];
    return cookieLooksLikeSupabaseAuth(name);
  });
}

export function HeaderAccount() {
  const [profile, setProfile] = useState<{
    display_name: string | null;
    role: UserRole;
  } | null>(null);

  useEffect(() => {
    if (!documentHasAuthCookie()) return;
    let cancelled = false;

    void (async () => {
      const { createBrowserSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserSupabaseClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile({
        display_name: data?.display_name ?? user.email?.split("@")[0] ?? "You",
        role: (data?.role as UserRole | undefined) ?? "user",
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) return null;

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
