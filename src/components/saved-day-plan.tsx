"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Hours } from "@/components/hours";
import { useDayPlan } from "@/components/day-plan-provider";
import { formatSlipDate, ticketKicker } from "@/lib/day-plan";
import {
  DAY_PLAN_HASH,
  DAY_PLAN_NAME,
  DAY_PLAN_SAVED_HREF,
} from "@/lib/constants";
import type { Vendor } from "@/types/database";

const plate =
  "bg-receipt ring-1 ring-border shadow-[inset_4px_0_0_var(--stamp)]";
const EMPTY_VENDORS: Array<Pick<Vendor, "slug" | "name">> = [];

export function SavedRailSlip() {
  const { plan } = useDayPlan();
  if (!plan) return null;

  return (
    <Link href={DAY_PLAN_SAVED_HREF} className="block bg-receipt px-3 py-2.5 shadow-[inset_4px_0_0_var(--stamp)] hover:bg-secondary/40">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
        <span className="text-base font-medium">{plan.hall.name}</span>
        {plan.hall.hours ? (
          <Hours value={plan.hall.hours} className="bg-stamp px-1.5 py-0.5 text-chalk" />
        ) : null}
      </div>
      <p className="mt-0.5 text-sm">{formatSlipDate(plan.hall.date)}</p>
    </Link>
  );
}

export function SavedDayPlan({
  vendors = EMPTY_VENDORS,
}: {
  vendors?: Array<Pick<Vendor, "slug" | "name">>;
}) {
  const { plan, show } = useDayPlan();
  const punched = plan
    ? plan.vendorSlugs.flatMap((slug) => {
        const vendor = vendors.find((row) => row.slug === slug);
        return vendor ? [vendor] : [];
      })
    : [];

  useEffect(() => {
    if (window.location.hash !== `#${DAY_PLAN_HASH}` && window.location.hash !== "#slip") return;
    document.getElementById(DAY_PLAN_HASH)?.scrollIntoView({ block: "start" });
  }, [plan]);

  return (
    <section id={DAY_PLAN_HASH} className="scroll-mt-28">
      <h2>{ticketKicker(plan?.hall.date)}</h2>
      {plan ? (
        <article className={`mt-3 ${plate}`}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-4 py-3">
            <Link
              href={`/markets/${plan.hall.slug}`}
              className="text-base font-medium hover:underline"
            >
              {plan.hall.name}
            </Link>
            {plan.hall.hours ? (
              <Hours
                value={plan.hall.hours}
                className="bg-stamp px-1.5 py-0.5 text-chalk"
              />
            ) : null}
          </div>
          <p className="border-t border-dashed border-border px-4 py-2 text-sm">
            {formatSlipDate(plan.hall.date)}
            {plan.vendorSlugs.length ? (
              <>
                {" · "}
                <span className="type-nums text-foreground">{plan.vendorSlugs.length}</span>
                {plan.vendorSlugs.length === 1 ? " stall punched" : " stalls punched"}
              </>
            ) : null}
          </p>
          {punched.length ? (
            <ul>
              {punched.map((vendor) => (
                <li
                  key={vendor.slug}
                  className="border-t border-dashed border-border px-4 py-2"
                >
                  <Link
                    href={`/vendors/${vendor.slug}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {vendor.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="border-t border-border px-4 py-2.5">
            <button
              type="button"
              onClick={show}
              className="stall-chip-sm inline-flex h-8 items-center bg-stamp px-3 text-sm font-medium text-chalk hover:brightness-110"
            >
              Open {DAY_PLAN_NAME}
            </button>
          </div>
        </article>
      ) : (
        <p className={`mt-3 px-4 py-3 text-sm text-muted-foreground ${plate}`}>
          No {DAY_PLAN_NAME} yet. Tap plus on a market listing.
        </p>
      )}
    </section>
  );
}
