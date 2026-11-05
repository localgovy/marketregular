"use client";

import { useEffect, useRef, useState } from "react";

const ROLL_MS = 480;
const HOLD_MS = 4200;

type Roll = {
  from: string;
  to: string;
  token: number;
};

export function CyclingPhrase({ phrases }: { phrases: readonly string[] }) {
  const [current, setCurrent] = useState(phrases[0] ?? "");
  const [roll, setRoll] = useState<Roll | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(current);
  const phrasesRef = useRef(phrases);
  currentRef.current = current;
  phrasesRef.current = phrases;

  const phraseKey = phrases.join("\u0000");

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const heading = node.closest("h1") ?? node;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || phrasesRef.current.length < 2) return;

    let cancelled = false;
    let holdTimer = 0;
    let rollTimer = 0;
    let rolling = false;
    let pointer = false;
    let focus = false;
    let onScreen = true;
    let index = 0;
    let token = 0;

    const blocked = () =>
      cancelled ||
      pointer ||
      focus ||
      !onScreen ||
      document.visibilityState !== "visible" ||
      media.matches;

    const clearHold = () => window.clearTimeout(holdTimer);

    const scheduleHold = () => {
      clearHold();
      if (blocked() || rolling) return;
      holdTimer = window.setTimeout(startRoll, HOLD_MS);
    };

    const startRoll = () => {
      if (blocked() || rolling) return;
      const phrasesNow = phrasesRef.current;
      const from = currentRef.current;
      const nextIndex = (index + 1) % phrasesNow.length;
      const to = phrasesNow[nextIndex] ?? from;
      index = nextIndex;
      if (to === from) {
        scheduleHold();
        return;
      }
      rolling = true;
      token += 1;
      setRoll({ from, to, token });
      rollTimer = window.setTimeout(() => {
        rolling = false;
        if (cancelled) return;
        setCurrent(to);
        setRoll(null);
        scheduleHold();
      }, ROLL_MS + 40);
    };

    const onPointerEnter = () => {
      pointer = true;
      clearHold();
    };
    const onPointerLeave = () => {
      pointer = false;
      scheduleHold();
    };
    const onFocusIn = () => {
      focus = true;
      clearHold();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && heading.contains(event.relatedTarget)) return;
      focus = false;
      scheduleHold();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleHold();
      else clearHold();
    };
    const onMotion = () => {
      if (!media.matches) {
        scheduleHold();
        return;
      }
      clearHold();
      window.clearTimeout(rollTimer);
      rolling = false;
      setRoll(null);
    };

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      if (onScreen) scheduleHold();
      else clearHold();
    });
    observer.observe(heading);

    heading.addEventListener("pointerenter", onPointerEnter);
    heading.addEventListener("pointerleave", onPointerLeave);
    heading.addEventListener("focusin", onFocusIn);
    heading.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVisibility);
    media.addEventListener("change", onMotion);
    scheduleHold();

    return () => {
      cancelled = true;
      clearHold();
      window.clearTimeout(rollTimer);
      observer.disconnect();
      heading.removeEventListener("pointerenter", onPointerEnter);
      heading.removeEventListener("pointerleave", onPointerLeave);
      heading.removeEventListener("focusin", onFocusIn);
      heading.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onMotion);
    };
  }, [phraseKey]);

  return (
    <>
      <span className="sr-only">{current}</span>
      <span ref={rootRef} aria-hidden className="whitespace-nowrap">
        {roll ? (
          <span className="relative inline-block align-baseline">
            <span className="invisible inline-grid">
              <span className="col-start-1 row-start-1 whitespace-nowrap">{roll.from}</span>
              <span className="col-start-1 row-start-1 whitespace-nowrap">{roll.to}</span>
            </span>
            <span className="phrase-roll-window">
              <span key={roll.token} className="phrase-roll-track">
                <span className="block h-[1lh] whitespace-nowrap">{roll.from}</span>
                <span className="block h-[1lh] whitespace-nowrap">{roll.to}</span>
              </span>
            </span>
          </span>
        ) : (
          current
        )}
      </span>
    </>
  );
}
