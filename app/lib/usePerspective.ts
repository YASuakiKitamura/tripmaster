"use client";

import { useSyncExternalStore } from "react";
import { PERSPECTIVES, type Perspective } from "./data";

const KEY = "seoul2026-perspective";
const DEFAULT: Perspective = "混合";
const listeners = new Set<() => void>();
let current: Perspective | null = null;

function isValid(v: string | null): v is Perspective {
  return v !== null && (PERSPECTIVES as string[]).includes(v);
}

function read(): Perspective {
  if (current !== null) return current;
  if (typeof window === "undefined") return DEFAULT;
  const saved = localStorage.getItem(KEY);
  current = isValid(saved) ? saved : DEFAULT;
  return current;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = isValid(e.newValue) ? e.newValue : DEFAULT;
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function setPerspective(p: Perspective) {
  current = p;
  if (typeof window !== "undefined") localStorage.setItem(KEY, p);
  listeners.forEach((l) => l());
}

/** 視点。同一タブ内でも全コンポーネントが即時同期する。 */
export function usePerspective(): [Perspective, (p: Perspective) => void] {
  const p = useSyncExternalStore(subscribe, read, () => DEFAULT);
  return [p, setPerspective];
}
