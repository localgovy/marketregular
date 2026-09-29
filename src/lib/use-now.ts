"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let clientNow = 0;
let timer: number | undefined;

function publish() {
  clientNow = Date.now();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (clientNow === 0) clientNow = Date.now();
  if (timer == null) timer = window.setInterval(publish, 60_000);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer != null) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

function getClientNow() {
  if (clientNow === 0) clientNow = Date.now();
  return clientNow;
}

/** Minute clock. The server snapshot stays on `serverNowMs` through hydration. */
export function useNow(serverNowMs: number) {
  return useSyncExternalStore(subscribe, getClientNow, () => serverNowMs);
}

/** Null until the client clock is available, so SSR does not invent a timestamp. */
export function useClientNow() {
  return useSyncExternalStore(subscribe, getClientNow, () => null as number | null);
}

function subscribeMounted() {
  return () => {};
}

export function useMounted() {
  return useSyncExternalStore(subscribeMounted, () => true, () => false);
}
