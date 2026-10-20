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

/** Solid woodcut / signwriter stamp — high-contrast negative-space relief on a 24x24 grid. */
function StampMark({ children, className, ...props }: MarkProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      fill="currentColor"
      shapeRendering="geometricPrecision"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Slatted harvest crate with orchard apple, tapered root carrot, and berry cluster — vendors selling today. */
export function CrateMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      {/* Left: orchard apple with stem & leaf */}
      <circle cx="6.2" cy="6.8" r="2.2" />
      <path d="M5.9 3.1H6.7V4.9H5.9Z" />
      <path d="M6.7 3.8C7.9 2.4 9.2 2.8 8.3 4.3C7.6 4.3 7.0 4.1 6.7 3.8Z" />
      {/* Center: tapered root carrot with 3-frond crown */}
      <polygon points="10.2,4.5 13.8,4.5 12.6,9.2 11.4,9.2" />
      <polygon points="12,4.5 10.1,1.6 11.5,3.4 12,1.2 12.5,3.4 13.9,1.6" />
      {/* Right: harvest berry cluster + stem */}
      <circle cx="16.2" cy="5.5" r="1.15" />
      <circle cx="18.6" cy="5.5" r="1.15" />
      <circle cx="15.4" cy="7.5" r="1.15" />
      <circle cx="17.6" cy="7.5" r="1.15" />
      <circle cx="19.8" cy="7.5" r="1.15" />
      <path d="M17.1 3.2H17.9V4.8H17.1Z" />
      {/* Dovetail slatted wooden bushel crate with corner stiles & top rim */}
      <path
        fillRule="evenodd"
        d="M2.2 9.2H21.8V11.3H20.6V21.4H3.4V11.3H2.2V9.2ZM5.6 12.6H18.4V14.3H5.6V12.6ZM5.6 16.0H18.4V17.7H5.6V16.0Z"
      />
    </StampMark>
  );
}

/** County-fair 16-pleat prize rosette with 5-point center star cutout and twin notched tails — top 5 this week. */
export function TallyMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path
        fillRule="evenodd"
        d="M12 2.6 12.87 3.79 14.12 3.02 14.47 4.45 15.92 4.23 15.7 5.68 17.13 6.03 16.36 7.28 17.55 8.15 16.36 9.02 17.13 10.27 15.7 10.62 15.92 12.07 14.47 11.85 14.12 13.28 12.87 12.51 12 13.7 11.13 12.51 9.88 13.28 9.53 11.85 8.08 12.07 8.3 10.62 6.87 10.27 7.64 9.02 6.45 8.15 7.64 7.28 6.87 6.03 8.3 5.68 8.08 4.23 9.53 4.45 9.88 3.02 11.13 3.79ZM12 5.45 12.64 7.28 14.57 7.31 13.03 8.48 13.59 10.33 12 9.23 10.41 10.33 10.97 8.48 9.43 7.31 11.36 7.28Z"
      />
      <polygon points="8.9,13.4 6.6,21.5 9.0,19.8 10.3,21.6 11.4,14.2" />
      <polygon points="15.1,13.4 17.4,21.5 15.0,19.8 13.7,21.6 12.6,14.2" />
    </StampMark>
  );
}

/** Woven market shopper's basket with twin handles, projecting rim, and wicker stave slots — saved. */
export function TicketMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <polygon points="6.0,7.4 8.3,2.2 10.2,2.2 8.2,7.4" />
      <polygon points="18.0,7.4 15.7,2.2 13.8,2.2 15.8,7.4" />
      <rect x="2.4" y="7.8" width="19.2" height="2.3" />
      <path
        fillRule="evenodd"
        d="M3.8 10.8H20.2L18.4 21.4H5.6L3.8 10.8ZM7.1 12.6L7.7 19.0H9.4L8.9 12.6H7.1ZM11.15 12.6V19.0H12.85V12.6H11.15ZM15.1 12.6L14.6 19.0H16.3L16.9 12.6H15.1Z"
      />
    </StampMark>
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

/** 4-bay striped market canopy & scalloped valance over an optical wayfinding lens — find / filters. */
export function SlatsMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      {/* Sloped 4-bay canopy with 3 perspective rib cutouts */}
      <path
        fillRule="evenodd"
        d="M3.2 1.5H20.8L22.4 5.8H1.6L3.2 1.5ZM5.75 5.8L6.7 1.5H7.85L7.15 5.8H5.75ZM11.3 5.8L11.4 1.5H12.6L12.7 5.8H11.3ZM16.85 5.8L16.15 1.5H17.3L18.25 5.8H16.85Z"
      />
      {/* 4 semicircular valance scallops aligned under the 4 canopy bays */}
      <path d="M1.6 6.6H5.75A2.075 2.075 0 0 1 1.6 6.6ZM7.15 6.6H11.3A2.075 2.075 0 0 1 7.15 6.6ZM12.7 6.6H16.85A2.075 2.075 0 0 1 12.7 6.6ZM18.25 6.6H22.4A2.075 2.075 0 0 1 18.25 6.6Z" />
      {/* Precision wayfinding loupe */}
      <path
        fillRule="evenodd"
        d="M10.8 10.2A5.2 5.2 0 1 0 10.8 20.6A5.2 5.2 0 0 0 10.8 10.2ZM10.8 12.45A2.95 2.95 0 1 1 10.8 18.35A2.95 2.95 0 0 1 10.8 12.45Z"
      />
      <polygon points="14.1,19.1 15.8,17.4 19.8,21.4 18.1,23.1" />
    </StampMark>
  );
}

/** Hanging market-day flip board with twin binding clasps and Saturday stamped tall — month / week. */
export function WeekMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      {/* Twin top iron binding clasps */}
      <rect x="6.4" y="1.6" width="2.2" height="3.8" />
      <rect x="15.4" y="1.6" width="2.2" height="3.8" />
      {/* Board frame with clasp cutouts, recessed calendar well, and 7-day blocks (Saturday tall on right) */}
      <path
        fillRule="evenodd"
        d="M2.6 4.2H5.5V6.2H9.5V4.2H14.5V6.2H18.5V4.2H21.4V21.4H2.6V4.2ZM4.6 8.6H19.4V19.4H4.6V8.6ZM6.1 10.2H9.1V13.2H6.1V10.2ZM10.5 10.2H13.5V13.2H10.5V10.2ZM14.9 10.2H17.9V17.8H14.9V10.2ZM6.1 14.8H9.1V17.8H6.1V14.8ZM10.5 14.8H13.5V17.8H10.5V14.8Z"
      />
    </StampMark>
  );
}

/** Folded triptych street atlas with arterial grid cuts and surveyor pin — map. */
export function BlocksMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      {/* Left map fold with street intersection */}
      <path
        fillRule="evenodd"
        d="M2.2 5.4L8.0 3.4V19.0L2.2 21.0V5.4ZM3.2 11.2L7.2 9.8V11.4L3.2 12.8V11.2ZM4.6 6.2L6.0 5.7V18.0L4.6 18.5V6.2Z"
      />
      {/* Center map fold with street intersection */}
      <path
        fillRule="evenodd"
        d="M9.3 3.4L14.7 5.4V21.0L9.3 19.0V3.4ZM10.1 9.8L13.9 11.2V12.8L10.1 11.4V9.8ZM11.4 5.9L12.8 6.4V18.5L11.4 18.0V5.9Z"
      />
      {/* Right map fold with carved surveyor pin + center dot */}
      <path
        fillRule="evenodd"
        d="M16.0 5.4L21.8 3.4V19.0L16.0 21.0V5.4ZM18.9 7.8C17.45 7.8 16.5 8.85 16.5 10.2C16.5 12.0 18.9 14.9 18.9 14.9C18.9 14.9 21.3 12.0 21.3 10.2C21.3 8.85 20.35 7.8 18.9 7.8Z"
      />
      <circle cx="18.9" cy="10.15" r="0.95" />
    </StampMark>
  );
}

/** Grand brick market hall facade with clerestory roof lantern, pediment, central arch, and side arcade bays — directory. */
export function RulesMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      {/* Clerestory roof monitor & gabled pediment with louver vent */}
      <path
        fillRule="evenodd"
        d="M8.6 1.6H15.4V3.6L22.4 7.8V8.8H1.6V7.8L8.6 3.6V1.6ZM10.2 5.2H13.8V6.8H10.2V5.2Z"
      />
      {/* Main hall masonry facade with central arched entrance & flanking arcade windows */}
      <path
        fillRule="evenodd"
        d="M2.6 9.8H21.4V18.8H15.2V14.2A3.2 3.2 0 0 0 8.8 14.2V18.8H2.6V9.8ZM4.5 11.6H6.9V16.6H4.5V11.6ZM17.1 11.6H19.5V16.6H17.1V11.6Z"
      />
      {/* Stone foundation plinth */}
      <rect x="1.6" y="19.6" width="20.8" height="2.0" />
    </StampMark>
  );
}

/** Enamel stall plate with four corner rivets and recessed inner tablet — a market, a place, identity plate. */
export function PlateMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path
        fillRule="evenodd"
        d="M2.5 4.0H21.5V20.0H2.5V4.0ZM6.2 7.6H17.8V16.4H6.2V7.6ZM4.4 5.9A0.85 0.85 0 1 0 4.4 7.6A0.85 0.85 0 0 0 4.4 5.9ZM19.6 5.9A0.85 0.85 0 1 0 19.6 7.6A0.85 0.85 0 0 0 19.6 5.9ZM4.4 16.4A0.85 0.85 0 1 0 4.4 18.1A0.85 0.85 0 0 0 4.4 16.4ZM19.6 16.4A0.85 0.85 0 1 0 19.6 18.1A0.85 0.85 0 0 0 19.6 16.4ZM8.4 10.6H15.6V13.4H8.4V10.6Z"
      />
    </StampMark>
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

/** Field reporter's clipboard with brass spring clip, masthead bar, and two-column dispatch rules — notes, blog, portals. */
export function SignMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      {/* Brass spring clip with center hanging hole */}
      <path
        fillRule="evenodd"
        d="M8.6 1.8H15.4V5.4H8.6V1.8ZM12 2.75A0.85 0.85 0 1 0 12 4.45A0.85 0.85 0 0 0 12 2.75Z"
      />
      {/* Clipboard frame, recessed sheet, masthead block, and 2-column broadsheet rules */}
      <path
        fillRule="evenodd"
        d="M4.2 4.2H7.4V6.4H16.6V4.2H19.8V21.4H4.2V4.2ZM6.4 8.0H17.6V19.2H6.4V8.0ZM7.6 9.2H16.4V11.0H7.6V9.2ZM7.6 12.4H11.4V13.6H7.6V12.4ZM12.6 12.4H16.4V13.6H12.6V12.4ZM7.6 14.6H11.4V15.8H7.6V14.6ZM12.6 14.6H16.4V15.8H12.6V14.6ZM7.6 16.8H11.4V18.0H7.6V16.8ZM12.6 16.8H15.2V18.0H12.6V16.8Z"
      />
    </StampMark>
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
