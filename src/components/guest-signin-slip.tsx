"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CloseMark } from "@/components/marks";
import { buttonVariants } from "@/components/ui/button";
import { rememberHomeWalkthrough } from "@/lib/home-walkthrough";
import { isSignInSlipAuthPath, subscribeSignInSlip } from "@/lib/signin-slip";
import { useAuthCookie } from "@/lib/supabase/use-auth-cookie";
import { cn } from "@/lib/utils";

export function GuestSignInSlip() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const copyId = useId();
  const signedIn = useAuthCookie();
  const [saveName, setSaveName] = useState("");
  const [saveCopy, setSaveCopy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const query = searchParams.toString();
  const next = `${pathname}${query ? `?${query}` : ""}`;
  const onAuthPage = isSignInSlipAuthPath(pathname);

  useEffect(() => {
    return subscribeSignInSlip((detail) => {
      if (signedIn) return;
      rememberHomeWalkthrough();
      setSaveName(detail.name);
      setSaveCopy(detail.copy ?? null);
      setOpen(true);
    });
  }, [signedIn]);

  useEffect(() => {
    if (!open || onAuthPage) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onAuthPage, open]);

  if (signedIn || onAuthPage || !open) return null;

  const copy = saveCopy
    ? saveCopy
    : saveName
      ? `Sign in to save ${saveName}.`
      : "Sign in to keep markets and vendors on a list that follows you.";

  return (
    <aside
      aria-label="Sign in"
      aria-describedby={copyId}
      className="fixed right-4 bottom-4 left-4 z-[60] max-w-none rounded-xl bg-card p-3 shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 duration-150 motion-reduce:animate-none sm:left-auto sm:w-[18rem]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <CloseMark className="size-4" />
      </button>
      <p id={copyId} className="pr-8 text-sm leading-snug">
        {copy}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          href={`/login?next=${encodeURIComponent(next || "/")}`}
          rel="nofollow"
          className={cn(buttonVariants({ size: "sm" }), "h-8 rounded-full px-4")}
        >
          Sign in
        </Link>
      </div>
    </aside>
  );
}
