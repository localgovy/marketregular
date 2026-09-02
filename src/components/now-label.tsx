import { cn } from "@/lib/utils";

/** Decorative; the adjacent status words already name the state. */
function OpenNowSprout() {
  return (
    <span className="open-now-sprout" role="presentation" aria-hidden="true">
      <span className="open-now-sprout__stem">
        <svg viewBox="0 0 16 16" role="presentation" focusable="false">
          <path d="M8.1 14.4C8.12 12.15 8.06 10 8.1 8.25" />
        </svg>
      </span>
      <span className="open-now-sprout__leaf open-now-sprout__leaf--left">
        <svg viewBox="0 0 16 16" role="presentation" focusable="false">
          <ellipse
            cx="4.15"
            cy="7.12"
            rx="4.2"
            ry="2.05"
            transform="rotate(20 4.15 7.12)"
          />
        </svg>
      </span>
      <span className="open-now-sprout__leaf open-now-sprout__leaf--right">
        <svg viewBox="0 0 16 16" role="presentation" focusable="false">
          <ellipse
            cx="12.05"
            cy="7.12"
            rx="4.2"
            ry="2.05"
            transform="rotate(-20 12.05 7.12)"
          />
        </svg>
      </span>
      <span className="open-now-sprout__leaf open-now-sprout__leaf--top">
        <svg viewBox="0 0 16 16" role="presentation" focusable="false">
          <ellipse cx="8.1" cy="3.4" rx="1.7" ry="3.2" />
        </svg>
      </span>
    </span>
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
