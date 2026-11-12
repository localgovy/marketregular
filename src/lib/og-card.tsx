import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const WORDMARK = readFile(join(process.cwd(), "public/brand/marketregular-wordmark.png"));
const WORDMARK_WIDTH = 324;
const WORDMARK_HEIGHT = 48;

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** Paper, board green and stamp red, matching the site. */
const PAPER = "#f4f1ea";
const INK = "#1c1916";
const BOARD = "#2c4a40";
const STAMP = "#9e4a3e";
const MUTED = "#5d574e";

/**
 * Rendered by satori, so this is deliberately flexbox-only with explicit sizes and no
 * custom fonts — a font fetch that fails would take the whole card down.
 */
export async function ogCard({
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
  const wordmark = await WORDMARK;
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
                  backgroundColor: STAMP,
                  color: PAPER,
                  padding: "8px 20px",
                }}
              >
                {plate}
              </div>
            </div>
          ) : null}
          {lines.slice(0, 2).map((line, index) => (
            <div key={index} style={{ fontSize: 34, color: MUTED, marginTop: 6 }}>
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
            <img
              src={`data:image/png;base64,${wordmark.toString("base64")}`}
              width={WORDMARK_WIDTH}
              height={WORDMARK_HEIGHT}
              alt=""
            />
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
