"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const ROLL_MS = 700;
const HOLD_MS = 4200;
const ROLL_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

type Roll = {
  from: string;
  to: string;
  token: number;
};

function RollingPhrase({ from, to, onDone }: { from: string; to: string; onDone: () => void }) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const track = trackRef.current;
    if (!clip || !track) return;

    const line = clip.getBoundingClientRect().height;
    track.querySelectorAll<HTMLElement>("[data-roll-line]").forEach((row) => {
      row.style.height = `${line}px`;
      row.style.lineHeight = `${line}px`;
    });

    const animation = track.animate(
      [{ transform: "translate3d(0, 0, 0)" }, { transform: `translate3d(0, ${-line}px, 0)` }],
      { duration: ROLL_MS, easing: ROLL_EASE, fill: "forwards" },
    );
    animation.onfinish = () => onDoneRef.current();
    return () => {
      animation.onfinish = null;
      if (animation.playState !== "finished") animation.cancel();
    };
  }, [from, to]);

  return (
    <span className="relative inline-block align-baseline whitespace-nowrap">
      <span className="invisible inline-grid">
        <span className="col-start-1 row-start-1 whitespace-nowrap">{from}</span>
        <span className="col-start-1 row-start-1 whitespace-nowrap">{to}</span>
      </span>
      <span ref={clipRef} className="phrase-roll-window">
        <span ref={trackRef} className="phrase-roll-track">
          <span data-roll-line className="phrase-roll-line">
            {from}
          </span>
          <span data-roll-line className="phrase-roll-line">
            {to}
          </span>
        </span>
      </span>
    </span>
  );
}

export function CyclingPhrase({ phrases }: { phrases: readonly string[] }) {
  const [current, setCurrent] = useState(phrases[0] ?? "");
  const [roll, setRoll] = useState<Roll | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const currentRef = useRef(current);
  const phrasesRef = useRef(phrases);
  const finishRef = useRef<() => void>(() => {});
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
      let settled = false;
      const finish = () => {
        if (settled || cancelled) return;
        settled = true;
        window.clearTimeout(rollTimer);
        rolling = false;
        setCurrent(to);
        setRoll(null);
        scheduleHold();
      };
      finishRef.current = finish;
      setRoll({ from, to, token });
      rollTimer = window.setTimeout(finish, ROLL_MS + 180);
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
          <RollingPhrase
            key={roll.token}
            from={roll.from}
            to={roll.to}
            onDone={() => finishRef.current()}
          />
        ) : (
          current
        )}
      </span>
    </>
  );
}
