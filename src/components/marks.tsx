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

/** Architectural drafting mark — 1.65px geometric line + selective solid fills. */
function DraftMark({ children, className, ...props }: MarkProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.65}
      strokeLinecap="square"
      strokeLinejoin="miter"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Countertop brass produce scale — vendors, stalls selling today. */
export function CrateMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <path d="M8 20.5H16" />
      <path d="M10 20.5L11 14.5H13L14 20.5" />
      <circle cx="12" cy="11.5" r="2.75" />
      <line x1="12" y1="11.5" x2="13.2" y2="10.1" />
      <line x1="4.5" y1="7.5" x2="19.5" y2="7.5" />
      <line x1="12" y1="5" x2="12" y2="8.75" />
      <path
        d="M2.75 7.5C2.75 9.6 4.2 10.8 6 10.8C7.8 10.8 9.25 9.6 9.25 7.5Z"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M14.75 7.5C14.75 9.6 16.2 10.8 18 10.8C19.8 10.8 21.25 9.6 21.25 7.5Z"
        fill="currentColor"
        stroke="none"
      />
    </DraftMark>
  );
}

/** County-fair prize rosette — ranking, this week’s top stalls. */
export function TallyMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <path d="M9.5 14.5L7.5 21.2L10.5 19.6L11.8 21.5L12 15" />
      <path d="M14.5 14.5L16.5 21.2L13.5 19.6L12.2 21.5" />
      <polygon points="12,2.4 14.1,3.7 16.5,3.4 17.5,5.6 19.7,6.6 19.4,9.0 20.7,11.1 19.4,13.2 19.7,15.6 17.5,16.6 16.5,18.8 14.1,18.5 12,19.8 9.9,18.5 7.5,18.8 6.5,16.6 4.3,15.6 4.6,13.2 3.3,11.1 4.6,9.0 4.3,6.6 6.5,5.6 7.5,3.4 9.9,3.7" />
      <circle cx="12" cy="11.1" r="4.2" fill="currentColor" stroke="none" />
    </DraftMark>
  );
}

/** Symmetric twin-notch perforated admission stub — saved. */
export function TicketMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <path d="M3 6.5H21V9.6C19.5 9.6 18.4 10.65 18.4 12C18.4 13.35 19.5 14.4 21 14.4V17.5H3V14.4C4.5 14.4 5.6 13.35 5.6 12C5.6 10.65 4.5 9.6 3 9.6V6.5Z" />
      <line x1="14.5" y1="6.5" x2="14.5" y2="8.4" />
      <line x1="14.5" y1="10.8" x2="14.5" y2="13.2" />
      <line x1="14.5" y1="15.6" x2="14.5" y2="17.5" />
      <line x1="7.5" y1="10.2" x2="11.8" y2="10.2" />
      <line x1="7.5" y1="13.8" x2="10.5" y2="13.8" />
    </DraftMark>
  );
}

/** Filled lens — search. */
export function SearchMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path
        fillRule="evenodd"
        d="M10.2 2.6a7.4 7.4 0 1 0 .02 14.8 7.4 7.4 0 0 0-.02-14.8Zm0 3.15a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5Z"
      />
      <path d="m15.15 14.55 2.15-2.15 4.55 4.55-2.15 2.15z" />
    </Mark>
  );
}

/** Precision wayfinding compass & reticle — find / filters. */
export function SlatsMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <line x1="12" y1="1.75" x2="12" y2="4.25" />
      <line x1="12" y1="19.75" x2="12" y2="22.25" />
      <line x1="1.75" y1="12" x2="4.25" y2="12" />
      <line x1="19.75" y1="12" x2="22.25" y2="12" />
      <polygon
        points="12,12 9.8,9.8 15.8,8.2 14.2,14.2"
        fill="currentColor"
        stroke="none"
      />
      <polygon points="15.8,8.2 14.2,14.2 8.2,15.8 9.8,9.8" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </DraftMark>
  );
}

/** Split-leaf almanac calendar with 7-day grid & Saturday stamped — month / week. */
export function WeekMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <rect x="3" y="4.5" width="18" height="16.5" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="7.5" y1="2.25" x2="7.5" y2="6" />
      <line x1="16.5" y1="2.25" x2="16.5" y2="6" />
      <rect x="5.5" y="11.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
      <rect x="9.2" y="11.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
      <rect x="12.9" y="11.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
      <rect x="16.2" y="10.9" width="2.8" height="6.8" fill="currentColor" stroke="none" />
      <rect x="5.5" y="15.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
      <rect x="9.2" y="15.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
      <rect x="12.9" y="15.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
    </DraftMark>
  );
}

/** Street grid with surveyor pin — map. */
export function BlocksMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <rect x="3" y="3.5" width="18" height="17" />
      <line x1="3" y1="14.5" x2="21" y2="11.5" />
      <line x1="9.2" y1="3.5" x2="7.5" y2="20.5" />
      <path
        d="M14.5 6.2C12.7 6.2 11.3 7.6 11.3 9.4C11.3 11.7 14.5 15.2 14.5 15.2C14.5 15.2 17.7 11.7 17.7 9.4C17.7 7.6 16.3 6.2 14.5 6.2Z"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="14.5" cy="9.3" r="1.25" fill="var(--card)" stroke="none" />
    </DraftMark>
  );
}

/** Archival hall ledger with A–Z index tabs — directory / list. */
export function RulesMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <rect x="4" y="3.5" width="13.5" height="17" />
      <line x1="7.2" y1="3.5" x2="7.2" y2="20.5" />
      <path d="M17.5 5.5H20.2V9H17.5" fill="currentColor" stroke="none" />
      <path d="M17.5 10.2H20.2V13.7H17.5" />
      <path d="M17.5 15H20.2V18.5H17.5" />
      <line x1="9.8" y1="8" x2="14.8" y2="8" />
      <line x1="9.8" y1="12" x2="14.8" y2="12" />
      <line x1="9.8" y1="16" x2="13.2" y2="16" />
    </DraftMark>
  );
}

/** Architectural hall badge with corner bolts — a market, a place, identity plate. */
export function PlateMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <rect x="3" y="4.5" width="18" height="15" />
      <rect x="6" y="7.5" width="12" height="9" />
      <rect x="8.8" y="10.2" width="6.4" height="3.6" fill="currentColor" stroke="none" />
    </DraftMark>
  );
}

/** National Flag of Canada — 2:1, red–white–red, 11-point maple. Red follows `currentColor`. */
export function MapleMark({ className, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 9600 4800"
      className={className}
      aria-hidden
      focusable="false"
      {...props}
    >
      <path
        d="m0 0h2400l99 99h4602l99-99h2400v4800h-2400l-99-99h-4602l-99 99H0z"
        style={{ fill: "currentColor" }}
      />
      <path
        d="m2400 0h4800v4800h-4800zm2490 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1-34 79l-212 99 941 762a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
        style={{ fill: "#fff" }}
      />
    </svg>
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

/** Folded broadsheet gazette with masthead & column rules — notes, blog, website. */
export function SignMark(props: MarkProps) {
  return (
    <DraftMark {...props}>
      <path d="M3.5 4.5H17.5V19.5H5.5C4.4 19.5 3.5 18.6 3.5 17.5V4.5Z" />
      <path d="M17.5 8.5H20.5V17.5C20.5 18.6 19.6 19.5 18.5 19.5H17.5" />
      <rect x="6.2" y="7" width="8.6" height="2.4" fill="currentColor" stroke="none" />
      <line x1="6.2" y1="12" x2="9.6" y2="12" />
      <line x1="6.2" y1="14.5" x2="9.6" y2="14.5" />
      <line x1="6.2" y1="17" x2="9.6" y2="17" />
      <line x1="11.4" y1="12" x2="14.8" y2="12" />
      <line x1="11.4" y1="14.5" x2="14.8" y2="14.5" />
      <line x1="11.4" y1="17" x2="14.8" y2="17" />
    </DraftMark>
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

/** Facebook glyph for outbound listing links. */
export function FacebookMark(props: MarkProps) {
  return (
    <Mark {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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

/** Faceted hall seal with a chalk check. Claimed listings. */
export function VerifiedMark(props: MarkProps) {
  return (
    <Mark {...props} shapeRendering="geometricPrecision">
      <polygon points="12,1.5 19.42,4.58 22.5,12 19.42,19.42 12,22.5 4.58,19.42 1.5,12 4.58,4.58" />
      <polygon
        fill="var(--chalk)"
        points="12,2.85 18.47,5.53 21.15,12 18.47,18.47 12,21.15 5.53,18.47 2.85,12 5.53,5.53"
      />
      <polygon points="12,4.3 17.44,6.56 19.7,12 17.44,17.44 12,19.7 6.56,17.44 4.3,12 6.56,6.56" />
      <polygon
        fill="var(--chalk)"
        points="9.54,10.98 10.9,12.35 14.46,8.79 16.05,10.37 10.9,15.51 7.96,12.57"
      />
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
