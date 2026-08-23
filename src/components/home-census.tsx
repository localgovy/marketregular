"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

function formatCount(value: number) {
  return value.toLocaleString("en-CA");
}

function CensusValue({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = formatCount(value);
      return;
    }

    let frame = 0;
    const started = performance.now();
    const duration = 1100;
    el.textContent = "0";

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 4;
      el.textContent = formatCount(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span
      ref={ref}
      aria-hidden
      className="inline-block font-mono text-3xl leading-none tabular-nums tracking-tight"
      style={{ minWidth: `${formatCount(value).length}ch` }}
    >
      {formatCount(value)}
    </span>
  );
}

function CensusCell({
  href,
  value,
  word,
}: {
  href?: string;
  value: number;
  word: string;
}) {
  const label = `${formatCount(value)} ${word}`;
  const className =
    "flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-3 py-3.5 text-foreground sm:px-4";
  const inner = (
    <>
      <CensusValue value={value} />
      <span className="text-base font-medium">{word}</span>
    </>
  );
  if (!href) {
    return (
      <p aria-label={label} className={className}>
        {inner}
      </p>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} outline-none transition-colors hover:bg-black/10 focus-visible:bg-black/10`}
    >
      {inner}
    </Link>
  );
}

export function HomeCensus({
  markets,
  vendors,
  menus,
}: {
  markets: number;
  vendors: number;
  menus: number;
}) {
  return (
    <nav
      aria-label="On the directory"
      className="-mx-4 -mt-5 mb-5 bg-ticket lg:-mx-6 lg:-mt-6"
    >
      <div className="grid grid-cols-3 divide-x divide-receipt/25">
        <CensusCell
          href="/markets"
          value={markets}
          word={markets === 1 ? "market" : "markets"}
        />
        <CensusCell
          value={vendors}
          word={vendors === 1 ? "vendor" : "vendors"}
        />
        <CensusCell
          value={menus}
          word={menus === 1 ? "menu item" : "menu items"}
        />
      </div>
    </nav>
  );
}
