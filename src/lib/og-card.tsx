import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/constants";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** Paper, board green and the ticket plate, matching the site. */
const PAPER = "#f4f1ea";
const INK = "#1c1916";
const BOARD = "#2c4a40";
const TICKET = "#b07f2a";
const MUTED = "#5d574e";

/**
 * Rendered by satori, so this is deliberately flexbox-only with explicit sizes and no
 * custom fonts — a font fetch that fails would take the whole card down.
 */
export function ogCard({
  kicker,
  title,
  lines,
  plate,
}: {
  kicker: string;
  title: string;
  lines: string[];
  plate?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: PAPER,
          color: INK,
          padding: "64px 72px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ width: 14, height: 44, backgroundColor: BOARD }} />
            <div style={{ fontSize: 30, color: MUTED, marginLeft: 18 }}>{kicker}</div>
          </div>
          <div
            style={{
              fontSize: title.length > 46 ? 66 : 82,
              fontWeight: 700,
              lineHeight: 1.06,
              marginTop: 34,
              maxWidth: 1010,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {plate ? (
            <div style={{ display: "flex", marginBottom: 22 }}>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  backgroundColor: TICKET,
                  color: PAPER,
                  padding: "8px 20px",
                }}
              >
                {plate}
              </div>
            </div>
          ) : null}
          {lines.slice(0, 2).map((line) => (
            <div key={line} style={{ fontSize: 34, color: MUTED, marginTop: 6 }}>
              {line}
            </div>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 30,
              borderTop: `3px solid ${BOARD}`,
              paddingTop: 22,
            }}
          >
            <div style={{ fontSize: 34, fontWeight: 700 }}>{SITE_NAME}</div>
            <div style={{ fontSize: 28, color: MUTED, marginLeft: 16 }}>
              marketregular.com
            </div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
