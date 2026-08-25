import type { ReactNode, SVGProps } from "react";

export type MarkProps = SVGProps<SVGSVGElement>;

function Mark({ children, className, ...props }: MarkProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      fill="currentColor"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Cut-corner stall plate path. */
function plate(x: number, y: number, w: number, h: number, c = 1.6) {
  return `M${x + c} ${y}H${x + w - c}L${x + w} ${y + c}V${y + h - c}L${x + w - c} ${y + h}H${x + c}L${x} ${y + h - c}V${y + c}Z`;
}

/** Produce crate — vendors, stalls. */
export function CrateMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M5.5 5h13l2.2 3.4H3.3Z" />
      <path
        fillRule="evenodd"
        d="M4 8.4h16v11.2H4Zm4.35 1.6h1.7v8h-1.7Zm5.6 0h1.7v8h-1.7Z"
      />
    </Mark>
  );
}

/** Chalk tally of five — ranking, this week’s top stalls. */
export function TallyMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="3.2" y="3.8" width="2.15" height="16.4" />
      <rect x="6.9" y="3.8" width="2.15" height="16.4" />
      <rect x="10.6" y="3.8" width="2.15" height="16.4" />
      <rect x="14.3" y="3.8" width="2.15" height="16.4" />
      <polygon points="15.4,4.6 21.1,18.2 18.7,19.4 13,5.8" />
    </Mark>
  );
}

/** Kept market ticket with a punch — saved. */
export function TicketMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        fillRule="evenodd"
        d="M3 6.2h18v11.6H3ZM0.85 12a2.15 2.15 0 1 0 4.3 0 2.15 2.15 0 1 0-4.3 0ZM13.6 8.8h5.2v1.45h-5.2Zm0 2.7h4.1v1.45h-4.1Zm0 2.7h5.2v1.45h-5.2Z"
      />
    </Mark>
  );
}

/** Stacked stall plates — find / filters. */
export function SlatsMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d={plate(3, 3.4, 18, 4.4, 1.3)} />
      <path d={plate(3, 9.8, 14.2, 4.4, 1.3)} />
      <path d={plate(3, 16.2, 16.2, 4.4, 1.3)} />
    </Mark>
  );
}

/** Seven day ticks; Saturday stands taller — month / week. */
export function WeekMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="2.6" y="9" width="1.7" height="8" />
      <rect x="5.5" y="9" width="1.7" height="8" />
      <rect x="8.4" y="9" width="1.7" height="8" />
      <rect x="11.3" y="9" width="1.7" height="8" />
      <rect x="14.2" y="9" width="1.7" height="8" />
      <rect x="17.1" y="4.6" width="1.85" height="12.4" />
      <rect x="20.1" y="9" width="1.7" height="8" />
    </Mark>
  );
}

/** Street grid with one occupied block — map. */
export function BlocksMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="3" y="7.2" width="18" height="2.1" />
      <rect x="3" y="14.7" width="18" height="2.1" />
      <rect x="7.2" y="3" width="2.1" height="18" />
      <rect x="14.7" y="3" width="2.1" height="18" />
      <path d={plate(16.6, 16.6, 4.6, 4.6, 1)} />
    </Mark>
  );
}

/** Chalkboard rules — directory / list. */
export function RulesMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="3" y="4.2" width="18" height="2.2" />
      <rect x="3" y="8.7" width="13.5" height="2.2" />
      <rect x="3" y="13.2" width="16.2" height="2.2" />
      <rect x="3" y="17.7" width="10.4" height="2.2" />
    </Mark>
  );
}

/** Cut-corner stall plate — a market, a place. */
export function PlateMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path fillRule="evenodd" d={`${plate(2.4, 2.4, 19.2, 19.2, 3.2)}M9.4 9.4h5.2v5.2H9.4z`} />
    </Mark>
  );
}

/** Eight-point chalk asterisk — rating. */
export function AsteriskMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="10.1" y="3.2" width="3.8" height="17.6" />
      <rect x="3.2" y="10.1" width="17.6" height="3.8" />
      <g transform="rotate(45 12 12)">
        <rect x="10.1" y="3.2" width="3.8" height="17.6" />
        <rect x="3.2" y="10.1" width="17.6" height="3.8" />
      </g>
    </Mark>
  );
}

/** Produce tag with a hole — topics. */
export function TagMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        fillRule="evenodd"
        d="M10.2 3.2h10.4v17.6H10.2L3.1 12Zm-1.4 8.8a1.85 1.85 0 1 0 3.7 0 1.85 1.85 0 1 0-3.7 0Z"
      />
    </Mark>
  );
}

/** Stall board with rules — website. */
export function SignMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        fillRule="evenodd"
        d={`${plate(3, 3, 18, 18, 2.4)}M7 7.2h10v2.4H7zm0 3.8h10v2.4H7zm0 3.8h7.2v2.4H7z`}
      />
    </Mark>
  );
}

/** Instagram glyph for outbound listing links. */
export function InstagramMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        fillRule="evenodd"
        d="M12 0C8.74 0 8.333.015 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.74 0 12s.014 3.667.072 4.948c.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.74 24 12 24s3.667-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 3.252.148 4.771 1.691 4.919 4.919.055 1.265.069 1.645.069 4.849 0 3.205-.016 3.585-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.055-1.646.069-4.85.069-3.204 0-3.585-.016-4.849-.069-3.26-.149-4.771-1.699-4.919-4.92-.055-1.265-.069-1.645-.069-4.849 0-3.204.014-3.585.069-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"
      />
    </Mark>
  );
}

/** TikTok glyph for outbound listing links. */
export function TikTokMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </Mark>
  );
}

export function CaretLeftMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <polygon points="15.8,4.2 7.2,12 15.8,19.8 18.2,17.2 12.2,12 18.2,6.8" />
    </Mark>
  );
}

export function CaretRightMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <polygon points="8.2,4.2 16.8,12 8.2,19.8 5.8,17.2 11.8,12 5.8,6.8" />
    </Mark>
  );
}

export function CaretUpMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <polygon points="4.2,15.8 12,7.2 19.8,15.8 17.2,18.2 12,12.2 6.8,18.2" />
    </Mark>
  );
}

export function CaretDownMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <polygon points="4.2,8.2 12,16.8 19.8,8.2 17.2,5.8 12,11.8 6.8,5.8" />
    </Mark>
  );
}

export function CloseMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <g transform="rotate(45 12 12)">
        <rect x="10.15" y="3.4" width="3.7" height="17.2" />
        <rect x="3.4" y="10.15" width="17.2" height="3.7" />
      </g>
    </Mark>
  );
}

export function CheckMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <polygon points="9.3,17.2 3.8,11.7 6.2,9.3 9.3,12.4 17.8,3.9 20.2,6.3" />
    </Mark>
  );
}

/** Cut-corner stall plate with a plus punched through. */
export function PlusMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        fillRule="evenodd"
        d={`${plate(2.4, 2.4, 19.2, 19.2, 3.2)}M10.7 6.6h2.6v4.7h4.7v2.6h-4.7v4.7h-2.6v-4.7H6v-2.6h4.7z`}
      />
    </Mark>
  );
}

/** Thick bar and square — warning, not a triangle bang. */
export function BangMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="10" y="3.2" width="4" height="11.4" />
      <rect x="10" y="16.6" width="4" height="4.2" />
    </Mark>
  );
}
