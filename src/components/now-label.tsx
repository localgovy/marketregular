import { cn } from "@/lib/utils";

/** Decorative; the adjacent status words already name the state. */
function OpenNowSprout() {
  return (
    <svg
      className="open-now-sprout"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="open-now-sprout__stem"
        d="M8.05 14.15C8.12 11.9 7.92 9.45 8.18 6.05"
      />
      <path
        className="open-now-sprout__leaf open-now-sprout__leaf--left"
        d="M7.92 10.12C5.62 10.24 3.78 8.98 3.2 6.78C5.5 6.63 7.28 7.78 7.92 10.12Z"
      />
      <path
        className="open-now-sprout__leaf open-now-sprout__leaf--right"
        d="M8.08 8.22C10.27 8.22 11.92 7.12 12.46 5.05C10.22 4.94 8.53 6.03 8.08 8.22Z"
      />
      <path
        className="open-now-sprout__leaf open-now-sprout__leaf--top"
        d="M8.15 6.22C6.75 4.7 6.97 2.48 8.68 1.2C10.08 2.86 9.82 4.98 8.15 6.22Z"
      />
    </svg>
  );
}

export function NowLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stall-chip-sm inline-flex items-center gap-1.5 bg-receipt px-2 py-0.5 text-sm font-medium text-stamp",
        className,
      )}
    >
      <OpenNowSprout />
      {children}
    </span>
  );
}
