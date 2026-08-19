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

/** Thick bar and square — warning, not a triangle bang. */
export function BangMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <rect x="10" y="3.2" width="4" height="11.4" />
      <rect x="10" y="16.6" width="4" height="4.2" />
    </Mark>
  );
}
