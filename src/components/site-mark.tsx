export function SiteMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <pattern
          id="mr-mark-awning"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="var(--board)" />
          <rect width="4" height="8" fill="var(--chalk)" />
        </pattern>
        <clipPath id="mr-mark-plate">
          <path d="M5 0H27L32 5V27L27 32H5L0 27V5Z" />
        </clipPath>
      </defs>
      <path d="M5 0H27L32 5V27L27 32H5L0 27V5Z" fill="var(--board)" />
      <rect
        width="32"
        height="7"
        fill="url(#mr-mark-awning)"
        clipPath="url(#mr-mark-plate)"
      />
      <path
        d="M6.2 1.6H25.8L30.4 6.2V25.8L25.8 30.4H6.2L1.6 25.8V6.2Z"
        fill="none"
        stroke="var(--ticket)"
        strokeWidth="1.15"
      />
      <text
        x="16"
        y="22.5"
        textAnchor="middle"
        fill="var(--chalk)"
        fontFamily="var(--font-sans), ui-sans-serif, system-ui, sans-serif"
        fontSize="11"
        fontWeight="600"
        letterSpacing="0.4"
      >
        mr
      </text>
    </svg>
  );
}
