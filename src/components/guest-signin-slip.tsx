"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CloseMark } from "@/components/marks";
import { buttonVariants } from "@/components/ui/button";
import {
  isSignInSlipAuthPath,
  subscribeSignInSlip,
} from "@/lib/signin-slip";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mr-signin-slip";
const BROWSE_DELAY_MS = 10_000;
const BROWSE_COPY = "Keep markets and vendors on a list that follows you.";

function browseWasDismissed() {
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return false;
  }
}

function rememberBrowseDismiss() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // private mode
  }
}

export function GuestSignInSlip() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const copyId = useId();
  const [guest, setGuest] = useState(false);
  const [browseDue, setBrowseDue] = useState(false);
  const [source, setSource] = useState<"browse" | "save" | null>(null);
  const [saveName, setSaveName] = useState("");

  const query = searchParams.toString();
  const next = `${pathname}${query ? `?${query}` : ""}`;
  const onAuthPage = isSignInSlipAuthPath(pathname);

  useEffect(() => {
    setGuest(!documentHasAuthCookie());
  }, [pathname]);

  useEffect(() => {
    if (!guest || browseWasDismissed()) return;
    const id = window.setTimeout(() => setBrowseDue(true), BROWSE_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [guest]);

  useEffect(() => {
    if (!guest || !browseDue || source) return;
    if (onAuthPage || browseWasDismissed()) return;
    setSource("browse");
  }, [browseDue, guest, onAuthPage, source]);

  useEffect(() => {
    return subscribeSignInSlip((detail) => {
      if (documentHasAuthCookie()) return;
      setSaveName(detail.name);
      setSource("save");
    });
  }, []);

  useEffect(() => {
    if (!source || onAuthPage) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onAuthPage, source]);

  function dismiss() {
    setSource(null);
    rememberBrowseDismiss();
  }

  if (!guest || onAuthPage || !source) return null;

  const copy =
    source === "save" && saveName ? `Sign in to save ${saveName}.` : BROWSE_COPY;

  return (
    <aside
      aria-label="Sign in"
      aria-describedby={copyId}
      className="fixed bottom-4 left-4 right-4 z-50 max-w-none rounded-xl bg-card p-3 shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 duration-150 motion-reduce:animate-none sm:left-auto sm:right-4 sm:w-[18rem]"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
      >
        <CloseMark className="size-4" />
      </button>
      <p id={copyId} className="pr-8 text-sm leading-snug">
        {copy}
      </p>
      <Link
        href={`/login?next=${encodeURIComponent(next || "/")}`}
        className={cn(buttonVariants({ size: "sm" }), "mt-3 h-8 rounded-full px-4")}
      >
        Sign in
      </Link>
    </aside>
  );
}
