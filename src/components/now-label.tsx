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
        d="M8.1 14.4C8.12 12.15 8.06 10 8.1 8.25"
      />
      <g className="open-now-sprout__leaf open-now-sprout__leaf--left">
        <ellipse
          cx="4.15"
          cy="7.12"
          rx="4.2"
          ry="2.05"
          transform="rotate(20 4.15 7.12)"
          fill="currentColor"
        />
      </g>
      <g className="open-now-sprout__leaf open-now-sprout__leaf--right">
        <ellipse
          cx="12.05"
          cy="7.12"
          rx="4.2"
          ry="2.05"
          transform="rotate(-20 12.05 7.12)"
          fill="currentColor"
        />
      </g>
      <g className="open-now-sprout__leaf open-now-sprout__leaf--top">
        <ellipse cx="8.1" cy="3.4" rx="1.7" ry="3.2" fill="currentColor" />
      </g>
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
        "inline-flex items-center gap-1.5 text-sm font-medium leading-none text-stamp",
        className,
      )}
    >
      <OpenNowSprout />
      {children}
    </span>
  );
}
