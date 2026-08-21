export function SiteMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path d="M3.4 0H28.6L32 3.4V28.6L28.6 32H3.4L0 28.6V3.4Z" fill="var(--board)" />
      <path
        d="M5.15 1.7H26.85L30.3 5.15V26.85L26.85 30.3H5.15L1.7 26.85V5.15Z"
        fill="none"
        stroke="var(--ticket)"
        strokeWidth="0.6"
        strokeLinejoin="miter"
      />
      <g
        fill="none"
        stroke="var(--chalk)"
        strokeWidth="1.2"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit={4}
      >
        <path d="M7.95 23.5V11.3L11.4 20.55 14.85 11.3V23.5" />
        <path d="M17.65 23.5V11.3H22.75L24.25 12.8V15.55L22.75 17.05H17.65" />
        <path d="M20.25 17.05 24.45 23.5" />
      </g>
    </svg>
  );
}
