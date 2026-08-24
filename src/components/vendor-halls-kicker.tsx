"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { VendorHall } from "@/types/database";

const CURSOR_GAP = 12;
const VIEW_PAD = 8;
const LEAVE_MS = 180;

function clampMenu(x: number, y: number, width: number, height: number) {
  const maxX = window.innerWidth - VIEW_PAD - width;
  const maxY = window.innerHeight - VIEW_PAD - height;
  return {
    x: Math.min(Math.max(VIEW_PAD, x), Math.max(VIEW_PAD, maxX)),
    y: Math.min(Math.max(VIEW_PAD, y), Math.max(VIEW_PAD, maxY)),
  };
}

function pointFromEvent(
  event: { clientX: number; clientY: number },
  trigger: HTMLElement | null,
) {
  if (event.clientX || event.clientY) {
    return { x: event.clientX + CURSOR_GAP, y: event.clientY + CURSOR_GAP };
  }
  const box = trigger?.getBoundingClientRect();
  if (!box) return { x: VIEW_PAD, y: VIEW_PAD };
  return { x: box.left, y: box.bottom + 6 };
}

export function VendorHallsKicker({ halls }: { halls: VendorHall[] }) {
  const menuId = useId();
  const count = halls.length;
  const label = count === 1 ? "Serving 1 market" : `Serving ${count} markets`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function hide() {
    cancelClose();
    pinnedRef.current = false;
    setOpen(false);
  }

  function showAt(event: { clientX: number; clientY: number }, pin: boolean) {
    cancelClose();
    pinnedRef.current = pin;
    setPos(pointFromEvent(event, triggerRef.current));
    setOpen(true);
  }

  function scheduleClose() {
    if (pinnedRef.current) return;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      pinnedRef.current = false;
      setOpen(false);
    }, LEAVE_MS);
  }

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const box = menuRef.current.getBoundingClientRect();
    const next = clampMenu(pos.x, pos.y, box.width, box.height);
    if (next.x !== pos.x || next.y !== pos.y) setPos(next);
  }, [open, pos.x, pos.y, halls]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      hide();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => () => cancelClose(), []);

  if (!count) {
    return <p className="type-kicker min-w-0 flex-1 text-muted-foreground">No markets</p>;
  }

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="dialog"
            aria-label="Markets"
            onPointerEnter={cancelClose}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") scheduleClose();
            }}
            className="fixed z-50 min-w-[12rem] max-w-[min(18rem,calc(100vw-1rem))] rounded-xl bg-card p-1.5 shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 duration-150 motion-reduce:animate-none"
            style={{ left: pos.x, top: pos.y }}
          >
            <ul className="max-h-[min(16rem,calc(100vh-1rem))] overflow-y-auto">
              {halls.map((hall) => (
                <li key={hall.slug}>
                  <Link
                    href={`/markets/${hall.slug}`}
                    className="block rounded-lg px-2.5 py-1.5 text-base font-medium hover:bg-muted"
                  >
                    {hall.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "type-kicker min-w-0 flex-1 cursor-pointer text-left text-muted-foreground outline-none hover:text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
        )}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="dialog"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") showAt(event, false);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") scheduleClose();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (open && pinnedRef.current) {
            hide();
            return;
          }
          showAt(event, true);
        }}
      >
        {label}
      </button>
      {menu}
    </>
  );
}
