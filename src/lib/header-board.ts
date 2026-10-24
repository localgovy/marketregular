/** Shared by the header and its refresh route. No server imports. */

export type HeaderBoardMarket = {
  slug: string;
  name: string;
  hours: string;
};

export type HeaderBoard = {
  openCount: number;
  /** "This morning", "Tomorrow", or a weekday. Says when the listed markets are. */
  label: string;
  markets: HeaderBoardMarket[];
  /** Epoch ms when this snapshot was computed. 0 means it is not usable yet. */
  asOf: number;
};

export const EMPTY_HEADER_BOARD: HeaderBoard = {
  openCount: 0,
  label: "Today",
  markets: [],
  asOf: 0,
};

export function daypartLabel(minutes: number) {
  if (minutes < 12 * 60) return "This morning";
  if (minutes < 17 * 60) return "This afternoon";
  return "This evening";
}

export type HeaderBoardSession = HeaderBoardMarket & {
  openNow: boolean;
  opensMinutes: number;
};

/** Open halls first, then ones still to open today. Null when today has nothing left. */
export function headerBoardFromToday(rows: HeaderBoardSession[], minutes: number): HeaderBoard | null {
  const open = rows.filter((row) => row.openNow);
  const later = rows.filter((row) => !row.openNow && row.opensMinutes > minutes);
  if (!open.length && !later.length) return null;
  return {
    openCount: open.length,
    label: daypartLabel(minutes),
    asOf: 0,
    markets: [...open, ...later].slice(0, 3).map(({ slug, name, hours }) => ({ slug, name, hours })),
  };
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isHeaderMarket(value: unknown): value is HeaderBoardMarket {
  if (!value || typeof value !== "object") return false;
  const market = value as HeaderBoardMarket;
  return (
    typeof market.slug === "string" &&
    SLUG.test(market.slug) &&
    typeof market.name === "string" &&
    market.name.length > 0 &&
    market.name.length < 120 &&
    typeof market.hours === "string" &&
    market.hours.length > 0 &&
    market.hours.length < 40
  );
}

/** Drops a bad market instead of throwing away the open count. */
export function parseHeaderBoard(value: unknown): HeaderBoard | null {
  if (!value || typeof value !== "object") return null;
  const board = value as HeaderBoard;
  if (!Number.isInteger(board.openCount) || board.openCount < 0 || board.openCount > 500) {
    return null;
  }
  if (typeof board.label !== "string" || board.label.length === 0 || board.label.length > 40) {
    return null;
  }
  if (typeof board.asOf !== "number" || !Number.isFinite(board.asOf) || board.asOf < 0) return null;
  if (!Array.isArray(board.markets)) return null;
  return {
    openCount: board.openCount,
    label: board.label,
    asOf: board.asOf,
    markets: board.markets.filter(isHeaderMarket).slice(0, 3),
  };
}

export function sameHeaderBoard(a: HeaderBoard, b: HeaderBoard) {
  return (
    a.openCount === b.openCount &&
    a.label === b.label &&
    a.markets.length === b.markets.length &&
    a.markets.every(
      (market, index) =>
        market.slug === b.markets[index]?.slug &&
        market.name === b.markets[index]?.name &&
        market.hours === b.markets[index]?.hours,
    )
  );
}
