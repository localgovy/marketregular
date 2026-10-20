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

/** Solid woodcut / signwriter stamp. Gaps are cut out of the fill. */
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

/** Slatted harvest crate with apple, carrot, and greens — vendors selling today. */
export function CrateMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path
        fillRule="evenodd"
        d="M3.2 9.35H20.8V21.35H3.2Z M5.55 11.35H18.45V12.85H5.55Z M5.55 14.55H18.45V16.05H5.55Z M5.55 17.75H18.45V19.15H5.55Z M3.2 13.7A1.85 1.85 0 0 1 3.2 17.4Z M20.8 13.7A1.85 1.85 0 0 0 20.8 17.4Z"
      />
      <path d="M10.4 4.15h3.2L12.15 9.6h-1.15z" />
      <path d="M10.55 4.15 9.2 1.5 11.25 3.65Z" />
      <path d="M11.2 3.9 11.9 1.15 12.65 3.9Z" />
      <path d="M12.5 4.15 14.75 1.65 13.2 3.8Z" />
      <path
        fillRule="evenodd"
        d="M4.25 7.2a2.2 2.2 0 1 0 4.4 0 2.2 2.2 0 1 0-4.4 0M5.95 5.2h1.05l.05 1.15h-1.15z"
      />
      <path d="M6.15 3.05h.75V5.25h-.75z" />
      <path d="M6.95 3.55C8.4 2.15 9.55 2.85 8.25 4.55 7.55 4.05 7.15 3.75 6.95 3.55Z" />
      <path d="M15.85 6.45a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0M17.55 6.05a1.3 1.3 0 1 0 2.6 0 1.3 1.3 0 1 0-2.6 0M16.7 7.85a1.45 1.45 0 1 0 2.9 0 1.45 1.45 0 1 0-2.9 0" />
      <path d="M18.15 4.85c1.35-1.2 2.35-.45 1.15.85-.4-.35-.8-.5-1.15-.6z" />
    </StampMark>
  );
}

/** County-fair rosette with a cut star and notched tails — this week’s top stalls. */
export function TallyMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path
        fillRule="evenodd"
        d="M12 2.6 12.87 3.79 14.12 3.02 14.47 4.45 15.92 4.23 15.7 5.68 17.13 6.03 16.36 7.28 17.55 8.15 16.36 9.02 17.13 10.27 15.7 10.62 15.92 12.07 14.47 11.85 14.12 13.28 12.87 12.51 12 13.7 11.13 12.51 9.88 13.28 9.53 11.85 8.08 12.07 8.3 10.62 6.87 10.27 7.64 9.02 6.45 8.15 7.64 7.28 6.87 6.03 8.3 5.68 8.08 4.23 9.53 4.45 9.88 3.02 11.13 3.79Z M12 5.7 12.58 7.36 14.33 7.39 12.93 8.45 13.44 10.13 12 9.13 10.56 10.13 11.07 8.45 9.67 7.39 11.42 7.36Z"
      />
      <path d="M9.1 12.2 6.7 21.4 9 19.7 10.2 21.6 11.4 12.8Z" />
      <path d="M14.9 12.2 17.3 21.4 15 19.7 13.8 21.6 12.6 12.8Z" />
    </StampMark>
  );
}

/** Woven market basket — saved. */
export function TicketMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path d="M6.15 7.75 8.35 2.25h1.9L8.45 7.75Z" />
      <path d="M17.85 7.75 15.65 2.25h-1.9l1.8 5.5Z" />
      <path
        fillRule="evenodd"
        d="M3.55 7.55h16.9l-.6 2.35H4.15ZM4.95 9.9h14.1l-1.65 11.45H6.6ZM8.35 12.35h1.55l-.25 6.7H8.1ZM11.25 12.35h1.55v6.7h-1.55ZM14.15 12.35h1.55l-.25 6.7h-1.55Z"
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

/** Striped stall awning and wayfinding lens — find / filters. */
export function SlatsMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path
        fillRule="evenodd"
        d="M3.15 1.55h17.7L21.98 6.05H1.55ZM5.57 6.05 6.63 1.55h1.26L7.02 6.05ZM11.04 6.05 11.37 1.55h1.25l-.13 4.5ZM16.51 6.05 16.11 1.55h1.25L17.96 6.05Z"
      />
      <path d="M1.66 6.15C1.66 7.2 2.51 8.05 3.56 8.05 4.61 8.05 5.46 7.2 5.46 6.15ZM7.13 6.15C7.13 7.2 7.98 8.05 9.03 8.05 10.08 8.05 10.93 7.2 10.93 6.15ZM12.6 6.15C12.6 7.2 13.45 8.05 14.5 8.05 15.55 8.05 16.4 7.2 16.4 6.15ZM18.07 6.15C18.07 7.2 18.92 8.05 19.97 8.05 21.02 8.05 21.87 7.2 21.87 6.15Z" />
      <path
        fillRule="evenodd"
        d="M11.15 10a4.2 4.2 0 1 0 .02 0ZM11.15 12.2a2 2 0 1 1-.02 0Z"
      />
      <path d="m13.4 17.5 2.1-1.9 3.7 3.9-2.1 1.9z" />
    </StampMark>
  );
}

/** Hanging market-day board. Saturday takes the wide stall — month / week. */
export function WeekMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path d="M2.6 5.7h18.8v3.45H2.6z" />
      <path
        fillRule="evenodd"
        d="M5.65 4.55a2.05 2.05 0 1 0 4.1 0 2.05 2.05 0 0 0-4.1 0Zm1.1 0a.95.95 0 1 1 1.9 0 .95.95 0 0 1-1.9 0ZM14.25 4.55a2.05 2.05 0 1 0 4.1 0 2.05 2.05 0 0 0-4.1 0Zm1.1 0a.95.95 0 1 1 1.9 0 .95.95 0 0 1-1.9 0Z"
      />
      <path d="M3.5 10.55h3.15v3.35H3.5zm4.65 0h3.15v3.35H8.15zm4.65 0h3.15v3.35h-3.15zm4.65 0h3.15v3.35h-3.15zM3.5 15.4h3.15v3.35H3.5zm4.65 0h7.8v3.35h-7.8zm9.3 0h3.15v3.35h-3.15z" />
    </StampMark>
  );
}

/** Folded street atlas with a survey pin — map. */
export function BlocksMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path
        fillRule="evenodd"
        d="M2.25 6.35 8.05 4.35v13.2l-5.8 2ZM3.15 11.15h4.15v1.55H3.15ZM4.55 6.7h1.55v9.4H4.55Z"
      />
      <path
        fillRule="evenodd"
        d="M9.45 4.35h5.4v15.3h-5.4ZM10.15 10.7h3.95v1.55h-3.95ZM11.35 5.7h1.55v8.6h-1.55Z"
      />
      <path
        fillRule="evenodd"
        d="M16.25 4.7 21.85 6.55v12.7l-5.6-1.85ZM19 7.55a2.15 2.15 0 0 0-2.15 2.15c0 1.7 2.15 4.15 2.15 4.15s2.15-2.45 2.15-4.15A2.15 2.15 0 0 0 19 7.55Z"
      />
      <circle cx="19" cy="9.7" r="0.78" />
    </StampMark>
  );
}

/** Market hall: monitor roof, arch, and side bays — directory. */
export function RulesMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path d="M1.5 8.25 9.15 3.4V1.45h5.7V3.4L22.5 8.25Z" />
      <path d="M1.15 7.85h21.7v1.7H1.15z" />
      <path
        fillRule="evenodd"
        d="M2 9.35h20v9.85H2ZM3.35 11.7h2.7v4.5h-2.7ZM17.95 11.7h2.7v4.5h-2.7ZM9 19.2V13.55A3 3 0 0 0 15 13.55V19.2Z"
      />
      <path d="M11.2 10.55h1.6l.3 1.65h-2.2z" />
      <path d="M1.35 18.55h21.3v3.05H1.35z" />
    </StampMark>
  );
}

/** Enamel stall plate with corner rivets — a market, a place. */
export function PlateMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path
        fillRule="evenodd"
        d="M3 4h18v16H3Zm3.4 3.4h11.2v9.2H6.4ZM3.98 5.7a.72.72 0 1 0 1.44 0 .72.72 0 0 0-1.44 0Zm14.6 0a.72.72 0 1 0 1.44 0 .72.72 0 0 0-1.44 0ZM3.98 18.3a.72.72 0 1 0 1.44 0 .72.72 0 0 0-1.44 0Zm14.6 0a.72.72 0 1 0 1.44 0 .72.72 0 0 0-1.44 0Z"
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

/** Field clipboard with a spring clip and two-column dispatch — notes, blog, portals. */
export function SignMark(props: MarkProps) {
  return (
    <StampMark {...props}>
      <path
        fillRule="evenodd"
        d="M4.4 6h15.2v15.4H4.4ZM6.5 8.55h11v10.7h-11z"
      />
      <path
        fillRule="evenodd"
        d="M8.7 6.9V3.7A3.3 1.7 0 0 1 12 2.15 3.3 1.7 0 0 1 15.3 3.7V6.9ZM10.95 4.15a1.05 1.05 0 1 0 2.1 0 1.05 1.05 0 0 0-2.1 0Z"
      />
      <path d="M7.55 9.45h8.9v1.6h-8.9zM7.55 12.45h3.7v1.05h-3.7zm4.85 0h3.9v1.05h-3.9zM7.55 14.55h3.7v1.05h-3.7zm4.85 0h3.9v1.05h-3.9zM7.55 16.65h3.7v1.05h-3.7zm4.85 0h3.9v1.05h-3.9z" />
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
