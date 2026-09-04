"use client";

import type { ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { EMPTY_SAVES, clearTombstones, replaceSaves } from "@/lib/saves";

export function SignOutForm({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      action={async () => {
        clearTombstones();
        replaceSaves(EMPTY_SAVES);
        await signOut();
      }}
    >
      {children}
    </form>
  );
}
