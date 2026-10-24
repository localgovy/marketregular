import { NextResponse } from "next/server";
import { getHeaderBoard } from "@/lib/header-board-load";

export const dynamic = "force-dynamic";

/** Small payload the header refetches when the copy it was given is stale. */
export async function GET() {
  const board = await getHeaderBoard();
  if (!board.asOf) {
    return NextResponse.json(board, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json(board, {
    headers: {
      "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
