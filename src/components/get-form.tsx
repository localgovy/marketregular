"use client";

import type { FormEvent, ReactNode } from "react";

/** Drop blank fields so a search does not keep `q=&market=&day=` on the URL. */
export function GetForm({
  action,
  className,
  role,
  children,
}: {
  action: string;
  className?: string;
  role?: string;
  children: ReactNode;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const cleared: Array<HTMLInputElement | HTMLSelectElement> = [];
    for (const el of form.elements) {
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) continue;
      if (el.type === "submit" || el.type === "checkbox" || el.type === "hidden") continue;
      if (el.value.trim() !== "") continue;
      el.disabled = true;
      cleared.push(el);
    }
    requestAnimationFrame(() => {
      for (const el of cleared) el.disabled = false;
    });
  }

  return (
    <form action={action} role={role} className={className} onSubmit={onSubmit}>
      {children}
    </form>
  );
}
